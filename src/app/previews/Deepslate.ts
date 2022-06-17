import * as deepslate19 from 'deepslate/worldgen'
import type { VersionId } from '../services/index.js'
import { checkVersion, fetchAllPresets } from '../services/index.js'
import { BiMap, deepClone, deepEqual } from '../Utils.js'

export type ProjectData = Record<string, Record<string, unknown>>

const DYNAMIC_REGISTRIES = new Set([
	'minecraft:worldgen/noise',
	'minecraft:worldgen/density_function',
	'minecraft:worldgen/noise_settings',
])

export class Deepslate {
	private d = deepslate19
	private loadedVersion: VersionId | undefined
	private loadingVersion: VersionId | undefined
	private loadingPromise: Promise<void> | undefined
	private readonly deepslateCache = new Map<VersionId, typeof deepslate19>()
	private readonly Y = 64
	private readonly Z = 0

	private cacheState: unknown
	private settingsCache: NoiseSettings | undefined
	private generatorCache: ChunkGenerator | undefined
	private chunksCache: Chunk[] = []
	private biomeCache: Map<string, string> = new Map()

	public async loadVersion(version: VersionId, project?: ProjectData) {
		if (this.loadedVersion === version) {
			this.applyProjectData(version, project)
			return
		}
		if (this.loadingVersion !== version || !this.loadingPromise) {
			this.loadingVersion = version
			this.loadingPromise = this.doLoadVersion(version, project)
		}
		return this.loadingPromise
	}

	private async doLoadVersion(version: VersionId, project?: ProjectData) {
		const cachedDeepslate = this.deepslateCache.get(version)
		if (cachedDeepslate) {
			this.d = cachedDeepslate
		} else {
			if (checkVersion(version, '1.19')) {
				this.d = deepslate19
			} else if (checkVersion(version, '1.18.2')) {
				this.d = await import('deepslate-1.18.2') as any
			} else {
				this.d = await import('deepslate-1.18') as any
			}
			if (checkVersion(version, '1.19')) {
				await Promise.all(this.d.Registry.REGISTRY.map(async (id, registry) => {
					if (DYNAMIC_REGISTRIES.has(id.toString())) {
						const entries = await fetchAllPresets(version, id.path)
						for (const [key, value] of entries.entries()) {
							registry.register(this.d.Identifier.parse(key), registry.parse(value), true)
						}
					}
				}))
			} else if (checkVersion(version, '1.18.2')) {
				await Promise.all([...DYNAMIC_REGISTRIES].map(async (id) => {
					const entries = await fetchAllPresets(version, id)
					for (const [key, value] of entries.entries()) {
						if (id === 'minecraft:worldgen/noise') {
							this.d.WorldgenRegistries.NOISE.register(this.d.Identifier.parse(key), this.d.NoiseParameters.fromJson(value), true)
						} else if (id === 'minecraft:worldgen/density_function') {
							this.d.WorldgenRegistries.DENSITY_FUNCTION.register(this.d.Identifier.parse(key), this.d.DensityFunction.fromJson(value), true)
						}
					}
				}))
			}
			this.deepslateCache.set(version, this.d)
		}
		this.applyProjectData(version, project)
		this.loadedVersion = version
		this.loadingVersion = undefined
	}

	private applyProjectData(version: VersionId, project?: ProjectData) {
		if (checkVersion(version, '1.19')) {
			this.d.Registry.REGISTRY.forEach((id, registry) => {
				if (DYNAMIC_REGISTRIES.has(id.toString())) {
					registry.clear()
					for (const [key, value] of Object.entries(project?.[id.path] ?? {})) {
						registry.register(this.d.Identifier.parse(key), registry.parse(value))
					}
				}
			})
		}
	}

	public loadChunkGenerator(settings: unknown, biomeState: unknown, seed: bigint) {
		if (!this.loadedVersion) {
			throw new Error('No deepslate version loaded')
		}
		const newCacheState = [settings, `${seed}`, biomeState]
		if (!deepEqual(this.cacheState, newCacheState)) {
			const biomeSource = checkVersion(this.loadedVersion, '1.19') ? this.d.BiomeSource.fromJson(biomeState)
				: new this.d.FixedBiome(checkVersion(this.loadedVersion, '1.18.2') ? this.d.Identifier.parse(biomeState as string) : biomeState as any)
			const noiseSettings = typeof settings === 'string' ? this.d.WorldgenRegistries.NOISE_SETTINGS.getOrThrow(this.d.Identifier.parse(settings)) : this.d.NoiseGeneratorSettings.fromJson(settings)
			const chunkGenerator = new this.d.NoiseChunkGenerator(seed, biomeSource, noiseSettings)
			this.settingsCache = noiseSettings.noise
			this.generatorCache = chunkGenerator
			this.chunksCache = []
			this.biomeCache = new Map()
			this.cacheState = deepClone(newCacheState)
		}
	}

	public generateChunks(minX: number, width: number, biome = 'unknown') {
		minX = Math.floor(minX)
		if (!this.settingsCache) {
			throw new Error('Tried to generate chunks before settings are loaded')
		}
		const minY = this.settingsCache.minY
		const height = this.settingsCache.height

		return [...Array(Math.ceil(width / 16) + 1)].map((_, i) => {
			const x: number = (minX >> 4) + i
			const cached = this.chunksCache.find(c => c.pos[0] === x)
			if (cached) {
				return cached
			}
			const chunk = new this.d.Chunk(minY, height, this.d.ChunkPos.create(x, this.Z >> 4))
			if (!this.generatorCache) {
				throw new Error('Tried to generate chunks before generator is loaded')
			}
			this.generatorCache.fill(chunk, true)
			this.generatorCache.buildSurface(chunk, biome)
			this.chunksCache.push(chunk)
			return chunk
		})
	}

	public fillBiomes(minX: number, maxX: number, minZ: number, maxZ: number, step = 1) {
		if (!this.generatorCache) {
			throw new Error('Tried to fill biomes before generator is loaded')
		}
		const quartY = this.Y >> 2
		const minQuartX = Math.floor(minX) >> 2
		const maxQuartX = Math.floor(maxX) >> 2
		const minQuartZ = Math.floor(minZ) >> 2
		const maxQuartZ = Math.floor(maxZ) >> 2
		const countX = Math.floor((maxQuartX - minQuartX) / step)
		const countZ = Math.floor((maxQuartZ - minQuartZ) / step)

		const biomeIds = new BiMap<string, number>()
		const data = new Int8Array(countX * countZ)
		let biomeId = 0
		let i = 0

		for (let x = minQuartX; x < maxQuartX; x += step) {
			for (let z = minQuartZ; z < maxQuartZ; z += step) {
				const posKey = `${x}:${z}`
				let biome = this.biomeCache.get(posKey)
				if (!biome) {
					biome = this.generatorCache.computeBiome(x, quartY, z).toString()
					this.biomeCache.set(posKey, biome)
				}
				data[i++] = biomeIds.computeIfAbsent(biome, () => biomeId++)
			}
		}

		return {
			palette: biomeIds.backward,
			data,
		}
	}

	public loadDensityFunction(state: unknown, seed: bigint) {
		const random = this.d.XoroshiroRandom.create(seed).forkPositional()
		const settings = this.d.NoiseSettings.fromJson({
			min_y: -64,
			height: 384,
			size_horizontal: 1,
			size_vertical: 2,
			sampling: { xz_scale: 1, y_scale: 1, xz_factor: 80, y_factor: 160 },
			bottom_slide: { target: 0.1171875, size: 3, offset: 0 },
			top_slide: { target: -0.078125, size: 2, offset: 8 },
			terrain_shaper: { offset: 0.044, factor: 4, jaggedness: 0 },
		})
		this.settingsCache = settings
		const originalFn = this.d.DensityFunction.fromJson(state)
		return originalFn.mapAll(new this.d.NoiseRouter.Visitor(random, settings))
	}

	public getNoiseSettings(): NoiseSettings {
		if (!this.settingsCache) {
			throw new Error('Tried to access noise settings when they are not loaded')
		}
		return this.settingsCache
	}

	public getBlockState(x: number, y: number) {
		x = Math.floor(x)
		y = Math.floor(y)
		const chunk = this.chunksCache.find(c => this.d.ChunkPos.minBlockX(c.pos) <= x && this.d.ChunkPos.maxBlockX(c.pos) >= x)
		return chunk?.getBlockState(this.d.BlockPos.create(x, y, this.Z))
	}
}

export const DEEPSLATE = new Deepslate()

interface NoiseSettings {
	minY: number
	height: number
}

interface ChunkGenerator {
	fill(chunk: Chunk, onlyFirstZ?: boolean): void
	buildSurface(chunk: Chunk, biome: string): void
	computeBiome(quartX: number, quartY: number, quartZ: number): deepslate19.Identifier
}

interface Chunk {
	readonly pos: deepslate19.ChunkPos
	getBlockState(pos: deepslate19.BlockPos): deepslate19.BlockState
}

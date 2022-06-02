import { DataModel } from '@mcschema/core'
import * as deepslate19 from 'deepslate/worldgen'
import type { VersionId } from '../services'
import { checkVersion, fetchAllPresets } from '../services'
import { deepClone, deepEqual } from '../Utils'

export class Deepslate {
	private d = deepslate19
	private loadedVersion: VersionId | undefined
	private loadingVersion: VersionId | undefined
	private loadingPromise: Promise<void> | undefined
	private readonly deepslateCache = new Map<VersionId, typeof deepslate19>()
	private readonly Z = 0

	private cacheState: unknown
	private settingsCache: NoiseSettings | undefined
	private generatorCache: ChunkGenerator | undefined
	private chunksCache: Chunk[] = []

	public async loadVersion(version: VersionId) {
		if (this.loadedVersion === version) {
			return
		}
		if (this.loadingVersion !== version || !this.loadingPromise) {
			this.loadingVersion = version
			this.loadingPromise = this.doLoadVersion(version)
		}
		return this.loadingPromise
	}

	private async doLoadVersion(version: VersionId) {
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
			if (this.d.WorldgenRegistries) {
				const REGISTRIES: [string, keyof typeof deepslate19.WorldgenRegistries, { fromJson(obj: unknown): any}][] = [
					['worldgen/noise', 'NOISE', this.d.NoiseParameters],
					['worldgen/density_function', 'DENSITY_FUNCTION', this.d.DensityFunction],
				]
				await Promise.all(REGISTRIES.map(async ([id, name, parser]) => {
					const entries = await fetchAllPresets(version, id)
					const registry = new this.d.Registry<typeof parser>(this.d.Identifier.create(id))
					for (const [key, value] of entries.entries()) {
						registry.register(this.d.Identifier.parse(key), parser.fromJson(value))
					}
					this.d.WorldgenRegistries[name].assign(registry as any)
				}))
			}
			this.deepslateCache.set(version, this.d)
		}
		this.loadedVersion = version
		this.loadingVersion = undefined
	}

	public loadChunkGenerator(settings: unknown, seed: bigint, biome = 'unknown') {
		if (!this.loadedVersion) {
			throw new Error('No deepslate version loaded')
		}
		const newCacheState = [settings, `${seed}`, biome]
		if (!deepEqual(this.cacheState, newCacheState)) {
			const biomeSource = new this.d.FixedBiome(checkVersion(this.loadedVersion, '1.18.2') ? this.d.Identifier.parse(biome) : biome as any)
			const noiseSettings = this.d.NoiseGeneratorSettings.fromJson(DataModel.unwrapLists(settings))
			const chunkGenerator = new this.d.NoiseChunkGenerator(seed, biomeSource, noiseSettings)
			this.settingsCache = noiseSettings.noise
			this.generatorCache = chunkGenerator
			this.chunksCache = []
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
			const x = (minX >> 4) + i
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

interface NoiseSettings {
	minY: number,
	height: number,
}

interface ChunkGenerator {
	fill(chunk: Chunk, onlyFirstZ?: boolean): void
	buildSurface(chunk: Chunk, biome: string): void
}

interface Chunk {
	readonly pos: deepslate19.ChunkPos;
	getBlockState(pos: deepslate19.BlockPos): deepslate19.BlockState;
}

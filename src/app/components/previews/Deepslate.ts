import * as deepslate19 from 'deepslate/worldgen'
import type { VersionId } from '../../services/index.js'
import { checkVersion, fetchAllPresets, fetchPreset } from '../../services/index.js'
import { clamp, computeIfAbsent, computeIfAbsentAsync, deepClone, deepEqual, isObject, square } from '../../Utils.js'

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
	private readonly Z = 0

	private cacheState: unknown
	private settingsCache: NoiseSettings | undefined
	private routerCache: NoiseRouter | undefined
	private generatorCache: ChunkGenerator | undefined
	private biomeSourceCache: BiomeSource | undefined
	private randomStateCache: deepslate19.RandomState | undefined
	private structureContextCache: deepslate19.WorldgenStructure.GenerationContext | undefined
	private chunksCache: Chunk[] = []
	private biomeCache: Map<string, string> = new Map()
	private readonly presetCache: Map<string, unknown> = new Map()

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
					const entries = await fetchAllPresets(version, id.replace(/^minecraft:/, ''))
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

	public async loadChunkGenerator(settings: unknown, biomeState: unknown, seed: bigint) {
		const newCacheState = [settings, `${seed}`, biomeState]
		if (!deepEqual(this.cacheState, newCacheState)) {
			const noiseSettings = this.createNoiseSettings(settings)
			const biomeSource = await this.createBiomeSource(noiseSettings, biomeState, seed)
			const chunkGenerator = this.isVersion('1.19')
				?	new this.d.NoiseChunkGenerator(biomeSource, noiseSettings)
				: new (this.d.NoiseChunkGenerator as any)(seed, biomeSource, noiseSettings)
			this.settingsCache = noiseSettings.noise
			this.generatorCache = chunkGenerator
			if (this.isVersion('1.19')) {
				this.randomStateCache = new this.d.RandomState(noiseSettings, seed)
				this.routerCache = this.randomStateCache.router
			} else {
				this.randomStateCache = undefined
				
				this.routerCache = undefined
			}
			this.biomeSourceCache = {
				getBiome: (x, y, z) => biomeSource.getBiome(x, y, z, undefined!),
			}
			this.chunksCache = []
			this.biomeCache = new Map()
			this.cacheState = deepClone(newCacheState)
		}
	}

	private async createBiomeSource(noiseSettings: deepslate19.NoiseGeneratorSettings, biomeState: unknown, seed: bigint): Promise<deepslate19.BiomeSource> {
		if (this.loadedVersion && isObject(biomeState) && typeof biomeState.preset === 'string') {
			const version = this.loadedVersion
			const preset = biomeState.preset.replace(/^minecraft:/, '')
			const biomes = await computeIfAbsentAsync(this.presetCache, `${version}-${preset}`, async () => {
				const dimension = await fetchPreset(version, 'dimension', preset === 'overworld' ? 'overworld' : 'the_nether')
				return dimension.generator.biome_source.biomes
			})
			biomeState = { type: biomeState.type, biomes }
		}
		if (this.isVersion('1.19')) {
			const bs = this.d.BiomeSource.fromJson(biomeState)
			return bs
		} else {
			const root = isObject(biomeState) ? biomeState : {}
			const type = typeof root.type === 'string' ? root.type.replace(/^minecraft:/, '') : undefined
			switch (type) {
				case 'fixed':
					return new (this.d as any).FixedBiome(this.isVersion('1.18.2') ? this.d.Identifier.parse(root.biome as string) : root.biome as any)
				case 'checkerboard':
					const shift = (root.scale ?? 2) + 2
					const numBiomes = root.biomes?.length ?? 0
					return { getBiome: (x: number, _y: number, z: number) => {
						const i = (((x >> shift) + (z >> shift)) % numBiomes + numBiomes) % numBiomes
						const biome = root.biomes?.[i]
						return this.isVersion('1.18.2') ? this.d.Identifier.parse(biome) : biome
					} }
				case 'multi_noise':
					if (this.isVersion('1.18')) {
						const parameters = new this.d.Climate.Parameters(root.biomes.map((b: any) => {
							const biome = this.isVersion('1.18.2') ? this.d.Identifier.parse(b.biome) : b.biome
							return [this.d.Climate.ParamPoint.fromJson(b.parameters), () => biome]
						}))
						const multiNoise = new (this.d as any).MultiNoise(parameters)
						let sampler: any
						if (this.isVersion('1.18.2')) {
							const router = this.d.NoiseRouter.create({
								temperature: new this.d.DensityFunction.Noise(0.25, 0, (this.d as any).Noises.TEMPERATURE),
								vegetation: new this.d.DensityFunction.Noise(0.25, 0, (this.d as any).Noises.VEGETATION),
								continents: new this.d.DensityFunction.Noise(0.25, 0, (this.d as any).Noises.CONTINENTALNESS),
								erosion: new this.d.DensityFunction.Noise(0.25, 0, (this.d as any).Noises.EROSION),
								ridges: new this.d.DensityFunction.Noise(0.25, 0, (this.d as any).Noises.RIDGE),
							})
							sampler = this.d.Climate.Sampler.fromRouter((this.d.NoiseRouter as any).withSettings(router, noiseSettings, seed))
						} else {
							const noiseSampler = new (this.d as any).NoiseSampler(this.d.NoiseSettings.fromJson(null), true, seed, true)
							sampler = (x: number, y: number, z: number) => noiseSampler.sample(x, y, z)
						}
						return { getBiome: (x: number, y: number, z: number) => {
							return multiNoise.getBiome(x, y, z, sampler)
						} }
					} else {
						const noise = ['altitude', 'temperature', 'humidity', 'weirdness']
							.map((id, i) => {
								const config = root[`${id}_noise`]
								config.firstOctave = clamp(config.firstOctave ?? -7, -100, -1)
								return new this.d.NormalNoise(new this.d.LegacyRandom(seed + BigInt(i)), config)
							})
						if (!Array.isArray(root.biomes) || root.biomes.length === 0) {
							return { getBiome: () => this.d.Identifier.create('unknown') }
						}
						return { getBiome: (x: number, _y: number, z: number) => {
							const n = noise.map(n => n.sample(x, z, 0))
							let minDist = Infinity
							let minBiome = 'unknown'
							for (const { biome, parameters: p } of root.biomes) {
								const dist = square(p.altitude - n[0]) + square(p.temperature - n[1]) + square(p.humidity - n[2]) + square(p.weirdness - n[3]) + square(p.offset)
								if (dist < minDist) {
									minDist = dist
									minBiome = biome
								}
							}
							return minBiome as unknown as deepslate19.Identifier
						} }
					}
				default: throw new Error(`Unsupported biome source ${type}`)
			}
		}
	}

	private createNoiseSettings(settings: unknown): deepslate19.NoiseGeneratorSettings {
		if (typeof settings === 'string') {
			if (this.isVersion('1.19')) {
				return this.d.WorldgenRegistries.NOISE_SETTINGS.getOrThrow(this.d.Identifier.parse(settings))
			} else {
				return this.d.NoiseGeneratorSettings.fromJson(undefined)
			}
		} else {
			return this.d.NoiseGeneratorSettings.fromJson(settings)
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
			if (checkVersion(this.loadedVersion!, '1.19')) {
				if (!this.randomStateCache) {
					throw new Error('Tried to generate chunks before random state is loaded')
				}
				this.generatorCache.fill(this.randomStateCache, chunk, true)
				this.generatorCache.buildSurface(this.randomStateCache, chunk, biome)
			} else {
				(this.generatorCache as any).fill(chunk, true);
				(this.generatorCache as any).buildSurface(chunk, biome)
			}
			this.chunksCache.push(chunk)
			return chunk
		})
	}

	public getBiome(x: number, y: number, z: number) {
		return computeIfAbsent(this.biomeCache, `${x}:${y}:${z}`, () => {
			if (this.isVersion('1.19')) {
				if (!this.randomStateCache || !this.generatorCache) {
					throw new Error('Tried to compute biomes before random state is loaded')
				}
				return this.generatorCache.computeBiome(this.randomStateCache, x, y, z).toString()
			} else {
				if(!this.biomeSourceCache) {
					throw new Error('Tried to compute biomes before biome source is loaded')
				}
				return this.biomeSourceCache.getBiome(x, y, z).toString()
			}
		})
	}

	public loadDensityFunction(state: unknown, minY: number, height: number, seed: bigint) {
		if (this.isVersion('1.19')) {
			const settings = this.d.NoiseGeneratorSettings.create({
				noise: {
					minY: minY,
					height: height,
					xzSize: 1,
					ySize: 2,
				},
				noiseRouter: this.d.NoiseRouter.create({
					finalDensity: this.d.DensityFunction.fromJson(state),
				}),
			})
			this.settingsCache = settings.noise
			const randomState = new this.d.RandomState(settings, seed)
			return randomState.router.finalDensity
		} else {
			const random = this.d.XoroshiroRandom.create(seed).forkPositional()
			const settings = this.d.NoiseSettings.fromJson({
				min_y: minY,
				height: height,
				size_horizontal: 1,
				size_vertical: 2,
				sampling: { xz_scale: 1, y_scale: 1, xz_factor: 80, y_factor: 160 },
				bottom_slide: { target: 0.1171875, size: 3, offset: 0 },
				top_slide: { target: -0.078125, size: 2, offset: 8 },
				terrain_shaper: { offset: 0.044, factor: 4, jaggedness: 0 },
			})
			this.settingsCache = settings
			const originalFn = this.d.DensityFunction.fromJson(state)
			return originalFn.mapAll(new (this.d.NoiseRouter as any).Visitor(random, settings))
		}
	}

	public loadStructureSet(state: unknown, seed: bigint) {
		if (!this.isVersion('1.19')) {
			throw new Error('Cannot load structure set prior to 1.19')
		}
		const settings = this.d.NoiseGeneratorSettings.create({
			noise: {
				minY: 0,
				height: 256,
				xzSize: 1,
				ySize: 2,
			},
			noiseRouter: this.d.NoiseRouter.create({
				finalDensity: this.d.DensityFunction.fromJson(state),
			}),
		})
		const unknownBiome = this.d.Identifier.create('unknown')
		const randomState = new this.d.RandomState(settings, seed)
		const biomeSource = new this.d.FixedBiomeSource(unknownBiome)
		const chunkGenerator = new this.d.NoiseChunkGenerator(biomeSource, settings)
		this.structureContextCache = { seed, settings, randomState, biomeSource, chunkGenerator }

		class SimpleStructure extends this.d.WorldgenStructure {
			constructor(settings: deepslate19.WorldgenStructure.StructureSettings) {
				super(settings)
			}
			findGenerationPoint(chunkX: number, chunkZ: number, _random: deepslate19.Random, _context: deepslate19.WorldgenStructure.GenerationContext): deepslate19.BlockPos {
				return [(chunkX << 4) + 8, 0, (chunkZ << 4) + 8]
			}
		}
		const structureSet = this.d.StructureSet.fromJson(state)
		for (const e of structureSet.structures) {
			const id = e.structure.key()
			if (id === undefined) {
				continue
			}
			const structure = new SimpleStructure({ validBiomes: new this.d.HolderSet([this.d.Holder.reference(this.d.WorldgenRegistries.BIOME, unknownBiome)])})
			this.d.WorldgenStructure.REGISTRY.register(id, structure)
			this.d.WorldgenRegistries.BIOME.register(unknownBiome, {})
		}
		if (structureSet.placement instanceof this.d.StructurePlacement.ConcentricRingsStructurePlacement) {
			const biomeTag = structureSet.placement['preferredBiomes'].key()
			if (biomeTag instanceof this.d.Identifier) {
				this.d.WorldgenRegistries.BIOME.getTagRegistry().register(biomeTag, new this.d.HolderSet([this.d.Holder.reference(this.d.WorldgenRegistries.BIOME, unknownBiome)]))
			}
		}
		
		return structureSet
	}

	public getWorldgenStructureContext(): deepslate19.WorldgenStructure.GenerationContext {
		if (!this.structureContextCache) {
			throw new Error('Tried to access structure context when it isn\'t loaded')
		}
		return this.structureContextCache
	}

	public getNoiseSettings(): NoiseSettings {
		if (!this.settingsCache) {
			throw new Error('Tried to access noise settings when it isn\'t loaded')
		}
		return this.settingsCache
	}

	public getNoiseRouter(): NoiseRouter {
		if (!this.routerCache) {
			throw new Error('Tried to access noise router when it isn\'t loaded')
		}
		return this.routerCache
	}

	public getBlockState(x: number, y: number) {
		x = Math.floor(x)
		y = Math.floor(y)
		const chunk = this.chunksCache.find(c => this.d.ChunkPos.minBlockX(c.pos) <= x && this.d.ChunkPos.maxBlockX(c.pos) >= x)
		return chunk?.getBlockState(this.d.BlockPos.create(x, y, this.Z))
	}

	private isVersion(min?: VersionId, max?: VersionId) {
		if (!this.loadedVersion) {
			throw new Error('No deepslate version loaded')
		}
		return checkVersion(this.loadedVersion, min, max)
	}
}

export const DEEPSLATE = new Deepslate()

interface NoiseSettings {
	minY: number
	height: number
}

interface NoiseRouter {
	temperature: deepslate19.DensityFunction
	vegetation: deepslate19.DensityFunction
	continents: deepslate19.DensityFunction
	erosion: deepslate19.DensityFunction
	ridges: deepslate19.DensityFunction
	depth: deepslate19.DensityFunction
}

interface ChunkGenerator {
	fill(randomState: deepslate19.RandomState, chunk: Chunk, onlyFirstZ?: boolean): void
	buildSurface(randomState: deepslate19.RandomState, chunk: Chunk, biome: string): void
	computeBiome(randomState: deepslate19.RandomState, quartX: number, quartY: number, quartZ: number): deepslate19.Identifier
}

interface Chunk {
	readonly pos: deepslate19.ChunkPos
	getBlockState(pos: deepslate19.BlockPos): deepslate19.BlockState
}

interface BiomeSource {
	getBiome(x: number, y: number, z: number): deepslate19.Identifier
}

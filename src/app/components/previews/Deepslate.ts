import type * as deepslate263 from 'deepslate'
import { HolderSet } from 'deepslate'
import type * as deepslate118 from 'deepslate-1.18'
import type * as deepslate1182 from 'deepslate-1.18.2'
import type * as deepslate119 from 'deepslate-1.19'
import type { VersionId } from '../../services/index.js'
import { checkVersion, fetchAllPresets, fetchRegistries } from '../../services/index.js'
import { computeIfAbsent, isObject } from '../../Utils.js'

export type ProjectData = Record<string, Record<string, unknown>>

export interface NoiseSampler {
	sample(x: number, y: number, z: number): number
}

export interface DensitySampler {
	sample(x: number, y: number, z: number): number
}

export interface BiomeSampler {
	sample(quartX: number, quartY: number, quartZ: number): string
}

export interface StructureSet {
	getStructure(chunkX: number, chunkZ: number): string | undefined
}
 
export interface ChunkGenerator {
	getBlockState(x: number, y: number, z: number): string
}

export interface Deepslate {
	loadProjectData(project: ProjectData): void
	initNoiseSampler(seed: bigint, noiseData: unknown): NoiseSampler
	initDensitySampler(seed: bigint, densityFunctionData: unknown): DensitySampler
	initBiomeSampler(seed: bigint, settingsData: unknown, biomeSourceData: unknown): BiomeSampler
	initChunkGenerator(seed: bigint, settingsData: unknown, biome: string): ChunkGenerator
	initStructureSet(seed: bigint, structureSetData: unknown): StructureSet
}

export namespace Deepslate {
	export async function load(version: VersionId): Promise<Deepslate> {
		if (checkVersion(version, '26.3')) {
			return Deepslate263.init(version, await import('deepslate'))
		} else if (checkVersion(version, '1.19')) {
			return Deepslate119.init(version, await import('deepslate-1.19'))
		} else if (checkVersion(version, '1.18.2')) {
			return Deepslate1182.init(version, await import('deepslate-1.18.2'))
		} else {
			return Deepslate118.init(version, await import('deepslate-1.18'))
		}
	}
}

export class Deepslate263 implements Deepslate {
	private constructor(
		private readonly d: typeof deepslate263,
	) {}

	static async init(version: VersionId, d: typeof deepslate263) {
		const dynamicRegistries = new Set(['minecraft:worldgen/noise', 'minecraft:worldgen/density_function', 'minecraft:worldgen/noise_settings', 'minecraft:worldgen/material_rule', 'minecraft:worldgen/material_condition'])
		const allRegistries = await fetchRegistries(version)
		await Promise.all(d.Registry.REGISTRY.map(async (id, registry) => {
			if (dynamicRegistries.has(id.toString())) {
				const entries = await fetchAllPresets(version, id.path)
				for (const [key, value] of entries.entries()) {
					registry.register(d.Identifier.parse(key), registry.parse(value), true)
				}
			} else if (id.is('minecraft:worldgen/biome')) {
				const keys = allRegistries.get(id.path)
				for (const key of keys ?? []) {
					registry.register(d.Identifier.parse(key), {}, true)
				}
				const tags = await fetchAllPresets(version, `tag/${id.path}`)
				const tagsRegistry = registry.getTagRegistry()
				for (const [key, value] of tags.entries()) {
					const tagId = d.Identifier.parse(key)
					tagsRegistry.register(tagId, HolderSet.fromJson(tagsRegistry, value, tagId), true)
				}
			}
		}))
		return new Deepslate263(d)
	}

	loadProjectData(project: ProjectData): void {
		this.d.Registry.REGISTRY.forEach((id, registry) => {
			registry.clear()
			for (const [key, value] of Object.entries(project?.[id.path] ?? {})) {
				registry.register(this.d.Identifier.parse(key), registry.parse(value))
			}
		})
	}

	initNoiseSampler(seed: bigint, noiseData: unknown): NoiseSampler {
		const normalNoise = this.d.NormalNoise.fromJson(noiseData)
		const random = this.d.XoroshiroRandom.create(seed)
		const noise = normalNoise.create(random)
		return {
			sample: (x, y, z) => noise.get3D(x, y, z),
		}
	}

	initDensitySampler(seed: bigint, densityFunctionData: unknown): DensitySampler {
		const settings = this.d.NoiseGeneratorSettings.create({
			noise: { minY: 0, height: 256 },
			noiseRouter: this.d.NoiseRouter.create({
				finalDensity: this.d.DensityFunction.fromJson(densityFunctionData),
			}),
		})
		const randomState = new this.d.RandomState(settings, seed)
		const densityFunction = randomState.router.finalDensity
		return {
			sample: (x, y, z) => densityFunction.compute(this.d.DensityFunction.context(x, y, z)),
		}
	}

	initBiomeSampler(seed: bigint, settingsData: unknown, biomeSourceData: unknown): BiomeSampler {
		const biomeSource = this.d.BiomeSource.fromJson(biomeSourceData)
		const settings = typeof settingsData === 'string'
			? this.d.WorldgenRegistries.NOISE_SETTINGS.getOrThrow(this.d.Identifier.parse(settingsData))
			: this.d.NoiseGeneratorSettings.fromJson(settingsData)
		const chunkGenerator = new this.d.NoiseChunkGenerator(biomeSource, settings)
		const randomState = new this.d.RandomState(settings, seed)
		return {
			sample: (x, y, z) => chunkGenerator.computeBiome(randomState, x, y, z).toString(),
		}
	}

	initChunkGenerator(seed: bigint, settingsData: unknown, biome: string): ChunkGenerator {
		const biomeId = this.d.Identifier.parse(biome)
		const biomeSource = new this.d.FixedBiomeSource(biomeId)
		const settings = typeof settingsData === 'string'
			? this.d.WorldgenRegistries.NOISE_SETTINGS.getOrThrow(this.d.Identifier.parse(settingsData))
			: this.d.NoiseGeneratorSettings.fromJson(settingsData)
		const chunkGenerator = new this.d.NoiseChunkGenerator(biomeSource, settings)
		const randomState = new this.d.RandomState(settings, seed)
		const chunkCache = new Map<bigint, deepslate263.Chunk>()
		return {
			getBlockState: (x, y, z) => {
				const chunkPos = this.d.ChunkPos.create(Math.floor(x) >> 4, Math.floor(z) >> 4)
				const chunkKey = this.d.ChunkPos.toLong(chunkPos)
				const chunk = computeIfAbsent(chunkCache, chunkKey, () => {
					const chunk = new this.d.Chunk(settings.noise.minY, settings.noise.height, chunkPos)
					chunkGenerator.buildTerrain(randomState, chunk, z === 0, biomeId)
					return chunk
				})
				const blockState = chunk.getBlockState(this.d.BlockPos.create(x, y, z))
				return blockState.getName().toString()
			},
		}
	}

	initStructureSet(seed: bigint, structureSetData: unknown): StructureSet {
		const settings = this.d.NoiseGeneratorSettings.create({
			noise: { minY: 0, height: 256 },
			noiseRouter: this.d.NoiseRouter.create({}),
		})
		const levelHeight: deepslate263.LevelHeight = { minY: 0, height: 256 }
		const unknownBiome = this.d.Identifier.create('unknown')
		const randomState = new this.d.RandomState(settings, seed)
		const biomeSource = new this.d.FixedBiomeSource(unknownBiome)
		const chunkGenerator = new this.d.NoiseChunkGenerator(biomeSource, settings)
		const context: deepslate263.WorldgenStructure.GenerationContext = { chunkGenerator, biomeSource, levelHeight, randomState, seed }

		class SimpleStructure extends this.d.WorldgenStructure {
			findGenerationPoint(chunkX: number, chunkZ: number, _random: deepslate263.Random, _context: deepslate263.WorldgenStructure.GenerationContext): deepslate263.BlockPos {
				return [(chunkX << 4) + 8, 0, (chunkZ << 4) + 8]
			}
		}
		const structureSet = this.d.StructureSet.fromJson(structureSetData)
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

		return {
			getStructure: (chunkX, chunkZ) => structureSet.getStructureInChunk(chunkX, chunkZ, context)?.id.toString(),
		}
	}
}

export class Deepslate119 implements Deepslate {
	constructor(
		private readonly d: typeof deepslate119,
	) {}

	static async init(version: VersionId, d: typeof deepslate119) {
		const dynamicRegistries = new Set(['minecraft:worldgen/noise', 'minecraft:worldgen/density_function', 'minecraft:worldgen/noise_settings'])
		await Promise.all(d.Registry.REGISTRY.map(async (id, registry) => {
			if (dynamicRegistries.has(id.toString())) {
				const entries = await fetchAllPresets(version, id.path)
				for (const [key, value] of entries.entries()) {
					registry.register(d.Identifier.parse(key), registry.parse(value), true)
				}
			}
		}))
		return new Deepslate119(d)
	}

	loadProjectData(project: ProjectData): void {
		this.d.Registry.REGISTRY.forEach((id, registry) => {
			registry.clear()
			for (const [key, value] of Object.entries(project?.[id.path] ?? {})) {
				registry.register(this.d.Identifier.parse(key), registry.parse(value))
			}
		})
	}

	initNoiseSampler(seed: bigint, data: unknown): NoiseSampler {
		const parameters = this.d.NoiseParameters.fromJson(data)
		const random = this.d.XoroshiroRandom.create(seed)
		const normalNoise = new this.d.NormalNoise(random, parameters)
		return normalNoise
	}

	initDensitySampler(seed: bigint, data: unknown): DensitySampler {
		const settings = this.d.NoiseGeneratorSettings.create({
			noise: { minY: 0, height: 256, xzSize: 1, ySize: 2 },
			noiseRouter: this.d.NoiseRouter.create({
				finalDensity: this.d.DensityFunction.fromJson(data),
			}),
		})
		const randomState = new this.d.RandomState(settings, seed)
		const densityFunction = randomState.router.finalDensity
		return {
			sample: (x, y, z) => densityFunction.compute(this.d.DensityFunction.context(x, y, z)),
		}
	}

	initBiomeSampler(seed: bigint, settingsData: unknown, biomeSourceData: unknown): BiomeSampler {
		const settings = typeof settingsData === 'string'
			? this.d.WorldgenRegistries.NOISE_SETTINGS.getOrThrow(this.d.Identifier.parse(settingsData))
			: this.d.NoiseGeneratorSettings.fromJson(settingsData)
		const biomeSource = this.d.BiomeSource.fromJson(biomeSourceData)
		const chunkGenerator = new this.d.NoiseChunkGenerator(biomeSource, settings)
		const randomState = new this.d.RandomState(settings, seed)
		console.log('BIOME SAMPLER', chunkGenerator, randomState)
		return {
			sample: (x, y, z) => chunkGenerator.computeBiome(randomState, x, y, z).toString(),
		}
	}

	initChunkGenerator(seed: bigint, settingsData: unknown, biome: string): ChunkGenerator {
		const biomeSource = new this.d.FixedBiomeSource(this.d.Identifier.parse(biome))
		const settings = typeof settingsData === 'string'
			? this.d.WorldgenRegistries.NOISE_SETTINGS.getOrThrow(this.d.Identifier.parse(settingsData))
			: this.d.NoiseGeneratorSettings.fromJson(settingsData)
		const chunkGenerator = new this.d.NoiseChunkGenerator(biomeSource, settings)
		const randomState = new this.d.RandomState(settings, seed)
		const chunkCache = new Map<bigint, deepslate119.Chunk>()
		return {
			getBlockState: (x, y, z) => {
				const chunkPos = this.d.ChunkPos.create(Math.floor(x) >> 4, Math.floor(z) >> 4)
				const chunkKey = this.d.ChunkPos.toLong(chunkPos)
				const chunk = computeIfAbsent(chunkCache, chunkKey, () => {
					const chunk = new this.d.Chunk(settings.noise.minY, settings.noise.height, chunkPos)
					chunkGenerator.fill(randomState, chunk, z === 0)
					chunkGenerator.buildSurface(randomState, chunk, biome)
					return chunk
				})
				const blockState = chunk.getBlockState(this.d.BlockPos.create(x, y, z))
				return blockState.getName().toString()
			},
		}
	}

	initStructureSet(seed: bigint, structureSetData: unknown): StructureSet {
		const settings = this.d.NoiseGeneratorSettings.create({
			noise: { minY: 0, height: 256, xzSize: 1, ySize: 2 },
			noiseRouter: this.d.NoiseRouter.create({}),
		})
		const levelHeight: deepslate119.LevelHeight = { minY: 0, height: 256 }
		const unknownBiome = this.d.Identifier.create('unknown')
		const randomState = new this.d.RandomState(settings, seed)
		const biomeSource = new this.d.FixedBiomeSource(unknownBiome)
		const chunkGenerator = new this.d.NoiseChunkGenerator(biomeSource, settings)
		const context = { seed, settings, randomState, biomeSource, chunkGenerator, levelHeight }

		class SimpleStructure extends this.d.WorldgenStructure {
			findGenerationPoint(chunkX: number, chunkZ: number, _random: deepslate119.Random, _context: deepslate119.WorldgenStructure.GenerationContext): deepslate119.BlockPos {
				return [(chunkX << 4) + 8, 0, (chunkZ << 4) + 8]
			}
		}
		const structureSet = this.d.StructureSet.fromJson(structureSetData)
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

		return {
			getStructure: (chunkX, chunkZ) => structureSet.getStructureInChunk(chunkX, chunkZ, context)?.id.toString(),
		}
	}
}

export class Deepslate1182 implements Deepslate {
	constructor(
		private readonly d: typeof deepslate1182,
	) {}

	static async init(version: VersionId, d: typeof deepslate1182) {
		const dynamicRegistries = new Set(['minecraft:worldgen/noise', 'minecraft:worldgen/density_function'])
		await Promise.all([...dynamicRegistries].map(async (id) => {
			const entries = await fetchAllPresets(version, id.replace(/^minecraft:/, ''))
			for (const [key, value] of entries.entries()) {
				if (id === 'minecraft:worldgen/noise') {
					d.WorldgenRegistries.NOISE.register(d.Identifier.parse(key), d.NoiseParameters.fromJson(value), true)
				} else if (id === 'minecraft:worldgen/density_function') {
					d.WorldgenRegistries.DENSITY_FUNCTION.register(d.Identifier.parse(key), d.DensityFunction.fromJson(value), true)
				}
			}
		}))
		return new Deepslate1182(d)
	}

	loadProjectData(_project: ProjectData): void {
	}

	initNoiseSampler(seed: bigint, data: unknown): NoiseSampler {
		const parameters = this.d.NoiseParameters.fromJson(data)
		const random = this.d.XoroshiroRandom.create(seed)
		const normalNoise = new this.d.NormalNoise(random, parameters)
		return normalNoise
	}

	initDensitySampler(seed: bigint, data: unknown): DensitySampler {
		const settings = this.d.NoiseSettings.fromJson({
			min_y: 0,
			height: 256,
			size_horizontal: 1,
			size_vertical: 2,
			sampling: { xz_scale: 1, y_scale: 1, xz_factor: 80, y_factor: 160 },
			bottom_slide: { target: 0.1171875, size: 3, offset: 0 },
			top_slide: { target: -0.078125, size: 2, offset: 8 },
			terrain_shaper: { offset: 0.044, factor: 4, jaggedness: 0 },
		})
		const originalFn = this.d.DensityFunction.fromJson(data)
		const random = this.d.XoroshiroRandom.create(seed).forkPositional()
		const densityFunction = originalFn.mapAll(new this.d.NoiseRouter.Visitor(random, settings))
		return {
			sample: (x, y, z) => densityFunction.compute(this.d.DensityFunction.context(x, y, z)),
		}
	}

	initBiomeSampler(seed: bigint, settingsData: unknown, biomeSourceData: unknown): BiomeSampler {
		const root = isObject(biomeSourceData) ? biomeSourceData : {}
		const type = typeof root.type === 'string' ? root.type.replace(/^minecraft:/, '') : undefined
		switch (type) {
			case 'fixed':
				const biome = typeof root.biome === 'string' ? root.biome : ''
				return {
					sample: (_x, _y, _z) => biome,
				}
			case 'checkerboard':
				const shift = (root.scale ?? 2) + 2
				const biomes = (Array.isArray(root.biomes) ? root.biomes : []).flatMap(e => typeof e === 'string' ? [e] : [])
				const numBiomes = biomes.length
				return {
					sample: (x, _y, z) => {
						const i = (((x >> shift) + (z >> shift)) % numBiomes + numBiomes) % numBiomes
						return biomes[i]
					},
				}
			case 'multi_noise':
				const parameters = new this.d.Climate.Parameters<deepslate1182.Identifier>(root.biomes.map((b: any) => {
					const biome = this.d.Identifier.parse(b.biome)
					return [this.d.Climate.ParamPoint.fromJson(b.parameters), () => biome]
				}))
				const multiNoise = new this.d.MultiNoise(parameters)
				const router = this.d.NoiseRouter.create({
					temperature: new this.d.DensityFunction.Noise(0.25, 0, this.d.Noises.TEMPERATURE),
					vegetation: new this.d.DensityFunction.Noise(0.25, 0, this.d.Noises.VEGETATION),
					continents: new this.d.DensityFunction.Noise(0.25, 0, this.d.Noises.CONTINENTALNESS),
					erosion: new this.d.DensityFunction.Noise(0.25, 0, this.d.Noises.EROSION),
					ridges: new this.d.DensityFunction.Noise(0.25, 0, this.d.Noises.RIDGE),
				})
				const noiseSettings = this.d.NoiseSettings.fromJson(settingsData)
				const sampler = this.d.Climate.Sampler.fromRouter(this.d.NoiseRouter.withSettings(router, noiseSettings, seed))
				return {
					sample: (x, y, z) => multiNoise.getBiome(x, y, z, sampler).toString(),
				}
			default:
				throw new Error(`Unsupported biome source ${type}`)
		}
	}

	initChunkGenerator(seed: bigint, settingsData: unknown, biome: string): ChunkGenerator {
		const biomeSource: deepslate1182.BiomeSource = {getBiome: () => this.d.Identifier.parse(biome)}
		const settings = this.d.NoiseGeneratorSettings.fromJson(settingsData)
		const chunkGenerator = new this.d.NoiseChunkGenerator(seed, biomeSource, settings)
		const chunkCache = new Map<bigint, deepslate1182.Chunk>()
		return {
			getBlockState: (x, y, z) => {
				const chunkPos = this.d.ChunkPos.create(Math.floor(x) >> 4, Math.floor(z) >> 4)
				const chunkKey = this.d.ChunkPos.toLong(chunkPos)
				const chunk = computeIfAbsent(chunkCache, chunkKey, () => {
					const chunk = new this.d.Chunk(settings.noise.minY, settings.noise.height, chunkPos)
					chunkGenerator.fill(chunk, z === 0)
					chunkGenerator.buildSurface(chunk, biome)
					return chunk
				})
				const blockState = chunk.getBlockState(this.d.BlockPos.create(x, y, z))
				return blockState.getName().toString()
			},
		}
	}

	initStructureSet(_seed: bigint, _structureSetData: unknown): StructureSet {
		throw new Error('Structure sets are not available in this version')
	}
}

export class Deepslate118 implements Deepslate {
	constructor(
		private readonly d: typeof deepslate118,
	) {}

	static async init(_version: VersionId, d: typeof deepslate118) {
		return new Deepslate118(d)
	}

	loadProjectData(_project: ProjectData): void {
	}

	initNoiseSampler(seed: bigint, data: unknown): NoiseSampler {
		const parameters = this.d.NoiseParameters.fromJson(data)
		const random = this.d.XoroshiroRandom.create(seed)
		const normalNoise = new this.d.NormalNoise(random, parameters)
		return normalNoise
	}

	initDensitySampler(_seed: bigint, _data: unknown): DensitySampler {
		throw new Error('Density functions are not available in this version')
	}

	initBiomeSampler(seed: bigint, _settingsData: unknown, biomeSourceData: unknown): BiomeSampler {
		const root = isObject(biomeSourceData) ? biomeSourceData : {}
		const type = typeof root.type === 'string' ? root.type.replace(/^minecraft:/, '') : undefined
		switch (type) {
			case 'fixed':
				const biome = typeof root.biome === 'string' ? root.biome : ''
				return {
					sample: (_x, _y, _z) => biome,
				}
			case 'checkerboard':
				const shift = (root.scale ?? 2) + 2
				const biomes = (Array.isArray(root.biomes) ? root.biomes : []).flatMap(e => typeof e === 'string' ? [e] : [])
				const numBiomes = biomes.length
				return {
					sample: (x, _y, z) => {
						const i = (((x >> shift) + (z >> shift)) % numBiomes + numBiomes) % numBiomes
						return biomes[i]
					},
				}
			case 'multi_noise':
				const parameters = new this.d.Climate.Parameters<string>(root.biomes.map((b: any) => {
					return [this.d.Climate.ParamPoint.fromJson(b.parameters), () => b.biome]
				}))
				const multiNoise = new this.d.MultiNoise(parameters)
				const noiseSampler = new (this.d as any).NoiseSampler(this.d.NoiseSettings.fromJson(null), true, seed, true)
				const sampler = (x: number, y: number, z: number) => noiseSampler.sample(x, y, z)
				return {
					sample: (x, y, z) => multiNoise.getBiome(x, y, z, sampler).toString(),
				}
			default:
				throw new Error(`Unsupported biome source ${type}`)
		}
	}

	initChunkGenerator(seed: bigint, settingsData: unknown, biome: string): ChunkGenerator {
		const biomeSource: deepslate118.BiomeSource = {getBiome: () => biome}
		const settings = this.d.NoiseGeneratorSettings.fromJson(settingsData)
		const chunkGenerator = new this.d.NoiseChunkGenerator(seed, biomeSource, settings)
		const chunkCache = new Map<bigint, deepslate118.Chunk>()
		return {
			getBlockState: (x, y, z) => {
				const chunkPos = this.d.ChunkPos.create(Math.floor(x) >> 4, Math.floor(z) >> 4)
				const chunkKey = this.d.ChunkPos.toLong(chunkPos)
				const chunk = computeIfAbsent(chunkCache, chunkKey, () => {
					const chunk = new this.d.Chunk(settings.noise.minY, settings.noise.height, chunkPos)
					chunkGenerator.fill(chunk)
					chunkGenerator.buildSurface(chunk, biome)
					return chunk
				})
				const blockState = chunk.getBlockState(this.d.BlockPos.create(x, y, z))
				return blockState.getName().toString()
			},
		}
	}

	initStructureSet(_seed: bigint, _structureSetData: unknown): StructureSet {
		throw new Error('Structure sets are not available in this version')
	}
}

import { DataModel } from '@mcschema/core'
import type { BlockState } from 'deepslate'
import { BlockPos, Chunk, ChunkPos, clampedMap, DensityFunction, FixedBiome, Identifier, NoiseChunkGenerator, NoiseGeneratorSettings, NoiseParameters, NoiseRouter, NoiseSettings, Registry, WorldgenRegistries, XoroshiroRandom } from 'deepslate'
import * as deepslate18 from 'deepslate-1.18'
import type { VersionId } from '../services'
import { checkVersion, fetchAllPresets } from '../services'
import { deepClone, deepEqual } from '../Utils'
import { NoiseChunkGenerator as OldNoiseChunkGenerator } from './noise/NoiseChunkGenerator'

export type NoiseSettingsOptions = {
	biome?: string,
	biomeScale?: number,
	biomeDepth?: number,
	offset: number,
	width: number,
	seed: bigint,
	version: VersionId,
}

const Z = 0

const colors: Record<string, [number, number, number]> = {
	'minecraft:air': [150, 160, 170],
	'minecraft:water': [20, 80, 170],
	'minecraft:lava': [200, 100, 0],
	'minecraft:stone': [55, 55, 55],
	'minecraft:deepslate': [34, 34, 36],
	'minecraft:bedrock': [10, 10, 10],
	'minecraft:grass_block': [47, 120, 23],
	'minecraft:dirt': [64, 40, 8],
	'minecraft:gravel': [70, 70, 70],
	'minecraft:sand': [196, 180, 77],
	'minecraft:sandstone': [148, 135, 52],
	'minecraft:netherrack': [100, 40, 40],
	'minecraft:crimson_nylium': [144, 22, 22],
	'minecraft:warped_nylium': [28, 115, 113],
	'minecraft:basalt': [73, 74, 85],
	'minecraft:end_stone': [200, 200, 140],
}

let cacheState: any
let generatorCache: NoiseChunkGenerator
let chunkCache: Chunk[] = []
const registryCache = new Map<VersionId, Registry<Registry<any>>>()

export async function noiseSettings(state: any, img: ImageData, options: NoiseSettingsOptions) {
	if (checkVersion(options.version, '1.18')) {
		if (checkVersion(options.version, '1.18.2')) {
			await initRegistries(options.version)
		}

		const { settings, generator } = getCached(state, options)

		const slice = new LevelSlice(-options.offset, options.width, settings.noise.minY, settings.noise.height)
		slice.generate(generator, options.biome)

		const data = img.data
		for (let x = 0; x < options.width; x += 1) {
			for (let y = 0; y < settings.noise.height; y += 1) {
				const i = x * 4 + (settings.noise.height-y-1) * 4 * img.width
				const state = slice.getBlockState([x - options.offset, y + settings.noise.minY, Z])
				const color = colors[state.getName().toString()] ?? [0, 0, 0]
				data[i] = color[0]
				data[i + 1] = color[1]
				data[i + 2] = color[2]
				data[i + 3] = 255
			}
		}
		return
	}

	const generator = new OldNoiseChunkGenerator(options.seed)
	generator.reset(state.noise, options.biomeDepth ?? 0, options.biomeScale ?? 0, options.offset, options.width)
	const data = img.data
	const row = img.width * 4
	for (let x = 0; x < options.width; x += 1) {
		const noise = generator.iterateNoiseColumn(x - options.offset).reverse()
		for (let y = 0; y < state.noise.height; y += 1) {
			const i = y * row + x * 4
			const color = getColor(noise, y)
			data[i] = color
			data[i + 1] = color
			data[i + 2] = color
			data[i + 3] = 255
		}
	}
}

export function getNoiseBlock(x: number, y: number) {
	const chunk = chunkCache.find(c => ChunkPos.minBlockX(c.pos) <= x && ChunkPos.maxBlockX(c.pos) >= x)
	if (!chunk) {
		return undefined
	}
	return chunk.getBlockState(BlockPos.create(x, y, Z))
}

export async function densityFunction(state: any, img: ImageData, options: NoiseSettingsOptions) {
	const { fn, settings } = await createDensityFunction(state, options)

	const arr = Array(options.width * settings.height)
	let min = Infinity
	let max = -Infinity
	for (let x = 0; x < options.width; x += 1) {
		for (let y = 0; y < settings.height; y += 1) {
			const i = x + (settings.height-y-1) * options.width
			const density = fn.compute(DensityFunction.context(x - options.offset, y, 0))
			min = Math.min(min, density)
			max = Math.max(max, density)
			arr[i] = density
		}
	}

	const data = img.data
	for (let i = 0; i < options.width * settings.height; i += 1) {
		const color = Math.floor(clampedMap(arr[i], min, max, 0, 256))
		data[4 * i] = color
		data[4 * i + 1] = color
		data[4 * i + 2] = color
		data[4 * i + 3] = 255
	}
}

async function createDensityFunction(state: any, options: NoiseSettingsOptions) {
	await initRegistries(options.version)

	const random = XoroshiroRandom.create(options.seed).forkPositional()
	const settings = NoiseSettings.fromJson({
		min_y: -64,
		height: 384,
		size_horizontal: 1,
		size_vertical: 2,
		sampling: { xz_scale: 1, y_scale: 1, xz_factor: 80, y_factor: 160 },
		bottom_slide: { target: 0.1171875, size: 3, offset: 0 },
		top_slide: { target: -0.078125, size: 2, offset: 8 },
		terrain_shaper: { offset: 0.044, factor: 4, jaggedness: 0 },
	})
	const originalFn = DensityFunction.fromJson(state)
	const fn = originalFn.mapAll(NoiseRouter.createVisitor(random, settings))

	return {
		fn,
		settings,
	}
}

const Registries: [string, { fromJson(obj: unknown): any}][] = [
	['worldgen/noise', NoiseParameters],
	['worldgen/density_function', DensityFunction],
]

async function initRegistries(version: VersionId) {
	const rootRegistries = registryCache.get(version) ?? new Registry(new Identifier('misode', 'temp'))
	if (!registryCache.has(version)) {
		await Promise.all(Registries.map(([id, c]) => fetchRegistry(version, rootRegistries, id, c)))
		registryCache.set(version, rootRegistries)
	}
	WorldgenRegistries.DENSITY_FUNCTION.clear().assign(rootRegistries.getOrThrow(Identifier.create('worldgen/density_function')))
	WorldgenRegistries.NOISE.clear().assign(rootRegistries.getOrThrow(Identifier.create('worldgen/noise')))
}

async function fetchRegistry<T extends { fromJson(obj: unknown): T }>(version: VersionId, root: Registry<Registry<unknown>>, id: string, clazz: T) {
	const entries = await fetchAllPresets(version, id)
	const registry = new Registry<typeof clazz>(Identifier.create(id))
	for (const [key, value] of entries.entries()) {
		registry.register(Identifier.parse(key), clazz.fromJson(value))
	}
	root.register(registry.key, registry)
}

function getCached(state: unknown, options: NoiseSettingsOptions) {
	const settings = NoiseGeneratorSettings.fromJson(DataModel.unwrapLists(state))

	const newState = [state, `${options.seed}`, options.biome]
	if (!deepEqual(newState, cacheState)) {
		cacheState = deepClone(newState)
		chunkCache = []
		if (checkVersion(options.version, '1.18.2')) {
			const biomeSource = new FixedBiome(Identifier.create('unknown'))
			generatorCache = new NoiseChunkGenerator(options.seed, biomeSource, settings)
		} else {
			const biomeSource = new deepslate18.FixedBiome('unknown')
			generatorCache = new deepslate18.NoiseChunkGenerator(options.seed, biomeSource, settings as any) as any
		}
	}
	return {
		settings,
		generator: generatorCache,
	}
}

function getColor(noise: number[], y: number): number {
	if (noise[y] > 0) {
		return 0
	}
	if (noise[y+1] > 0) {
		return 150
	}
	return 255
}

class LevelSlice {
	private readonly chunks: Chunk[]
	private readonly done: boolean[]

	constructor(
		private readonly minX: number,
		width: number,
		minY: number,
		height: number,
	) {
		this.done = []
		this.chunks = [...Array(Math.ceil(width / 16) + 1)]
			.map((_, i) => {
				const x = (minX >> 4) + i
				const cached = chunkCache.find(c => c.pos[0] === x)
				if (cached) {
					this.done[i] = true
					return cached
				}
				return new Chunk(minY, height, ChunkPos.create(x, Z >> 4))
			})
	}

	public generate(generator: NoiseChunkGenerator, forcedBiome?: string) {
		this.chunks.forEach((chunk, i) => {
			if (!this.done[i]) {
				generator.fill(chunk, true)
				generator.buildSurface(chunk, forcedBiome)
				this.done[i] = true
				chunkCache.push(chunk)
			}
		})
	}

	public getBlockState(pos: BlockPos): BlockState {
		const chunkIndex = (pos[0] >> 4) - (this.minX >> 4)
		return this.chunks[chunkIndex].getBlockState(pos)
	}
}

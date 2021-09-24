import type { BlockPos, BlockState } from 'deepslate'
import { Chunk, ChunkPos, FixedBiome, NoiseChunkGenerator, NoiseGeneratorSettings } from 'deepslate'
import type { VersionId } from '../Schemas'
import { checkVersion } from '../Schemas'
import { deepClone, deepEqual, unwrapLists } from '../Utils'
import { NoiseChunkGenerator as OldNoiseChunkGenerator } from './noise/NoiseChunkGenerator'

export type NoiseSettingsOptions = {
	biomeFactor: number,
	biomeOffset: number,
	biomePeaks: number,
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
	'minecraft:stone': [50, 50, 50],
	'minecraft:netherrack': [100, 40, 40],
	'minecraft:end_stone': [200, 200, 140],
}

let cacheState: any
let generatorCache: NoiseChunkGenerator
let chunkCache: Chunk[] = []

export function noiseSettings(state: any, img: ImageData, options: NoiseSettingsOptions) {
	if (checkVersion(options.version, '1.18')) {
		const { settings, generator } = getCached(state, options)

		const slice = new LevelSlice(-options.offset, options.width, settings.noise.minY, settings.noise.height)
		slice.fill(generator)

		const data = img.data
		for (let x = 0; x < options.width; x += 1) {
			for (let y = 0; y < settings.noise.height; y += 1) {
				const i = x * 4 + (settings.noise.height-y-1) * 4 * img.width
				const state = slice.getBlockState([x - options.offset, y, Z])
				const color = colors[state.getName()] ?? [0, 0, 0]
				data[i] = color[0]
				data[i + 1] = color[1]
				data[i + 2] = color[2]
				data[i + 3] = 255
			}
		}
		return
	}

	const generator = new OldNoiseChunkGenerator(options.seed)
	generator.reset(state.noise, options.biomeOffset, options.biomeFactor, options.offset, 200)
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

function getCached(state: unknown, options: NoiseSettingsOptions) {
	const settings = NoiseGeneratorSettings.fromJson(unwrapLists(state))
	// Temporary fix for slides
	settings.noise.bottomSlide.target *= 128
	settings.noise.topSlide.target *= 128
	const shape = { factor: options.biomeFactor, offset: options.biomeOffset, peaks: options.biomePeaks, nearWater: false }

	const newState = [state, shape, `${options.seed}`]
	if (!deepEqual(newState, cacheState)) {
		cacheState = deepClone(newState)
		chunkCache = []
		const biomeSource = new FixedBiome('unknown')
		generatorCache = new NoiseChunkGenerator(options.seed, biomeSource, settings, shape)
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
	private readonly filled: boolean[]

	constructor(
		private readonly minX: number,
		width: number,
		minY: number,
		height: number,
	) {
		this.filled = []
		this.chunks = [...Array(Math.ceil(width / 16) + 1)]
			.map((_, i) => {
				const x = (minX >> 4) + i
				const cached = chunkCache.find(c => c.pos[0] === x)
				if (cached) {
					this.filled[i] = true
					return cached
				}
				return new Chunk(minY, height, ChunkPos.create(x, Z >> 4))
			})
	}

	public fill(generator: NoiseChunkGenerator) {
		this.chunks.forEach((chunk, i) => {
			if (!this.filled[i]) {
				generator.fill(chunk)
				this.filled[i] = true
				chunkCache.push(chunk)
			}
		})
	}

	public getBlockState(pos: BlockPos): BlockState {
		const chunkIndex = (pos[0] >> 4) - (this.minX >> 4)
		return this.chunks[chunkIndex].getBlockState(pos)
	}
}

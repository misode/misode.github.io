import type { BlockPos, NoiseGeneratorSettings } from 'deepslate'
import { BlockState, Chunk, ChunkPos, FixedBiome, NoiseChunkGenerator } from 'deepslate'
import type { VersionId } from '../Schemas'
import { checkVersion } from '../Schemas'
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

let stateCache: string = ''
let chunkCache: Chunk[] = []

export function noiseSettings(state: any, img: ImageData, options: NoiseSettingsOptions) {
	if (checkVersion(options.version, '1.18')) {
		const settings = readSettings(state)
		const biomeSource = new FixedBiome('unknown', { offset: options.biomeOffset, factor: options.biomeFactor, peaks: options.biomePeaks, nearWater: false})
		const generator = new NoiseChunkGenerator(options.seed, biomeSource, settings)

		const newState = `${options.seed} ${options.biomeOffset} ${options.biomeFactor} ${options.biomePeaks} ${JSON.stringify(state)}`
		if (newState !== stateCache) {
			stateCache = newState
			chunkCache = []
		}

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

	const generator = new OldNoiseChunkGenerator(options.seed.toString())
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

function getColor(noise: number[], y: number): number {
	if (noise[y] > 0) {
		return 0
	}
	if (noise[y+1] > 0) {
		return 150
	}
	return 255
}

function readSettings(obj: any): NoiseGeneratorSettings {
	return {
		defaultBlock: readBlockState(obj?.default_block, new BlockState('minecraft:stone')),
		defaultFluid: readBlockState(obj?.default_fluid, new BlockState('minecraft:water', { level: '0' })),
		bedrockRoofPosition: readNumber(obj?.bedrock_roof_position, -2147483648),
		bedrockFloorPosition: readNumber(obj?.bedrock_floor_position, -2147483648),
		seaLevel: readNumber(obj?.sea_level, 0),
		minSurfaceLevel: readNumber(obj?.min_surface_level, 0),
		disableMobGeneration: false,
		aquifersEnabled: false,
		noiseCavesEnabled: false,
		deepslateEnabled: false,
		oreVeinsEnabled: false,
		noodleCavesEnabled: false,
		structures: { structures: {} },
		noise: {
			minY: readNumber(obj?.noise?.min_y, 0),
			height: readNumber(obj?.noise?.height, 256),
			xzSize: readNumber(obj?.noise?.size_horizontal, 1),
			ySize: readNumber(obj?.noise?.size_vertical, 1),
			densityFactor: readNumber(obj?.noise?.density_factor, 0),
			densityOffset: readNumber(obj?.noise?.density_offset, 0),
			sampling: {
				xzScale: readNumber(obj?.noise?.sampling?.xz_scale, 1),
				yScale: readNumber(obj?.noise?.sampling?.y_scale, 1),
				xzFactor: readNumber(obj?.noise?.sampling?.xz_factor, 80),
				yFactor: readNumber(obj?.noise?.sampling?.y_factor, 80),
			},
			topSlide: {
				target: readNumber(obj?.noise?.top_slide?.target, 0),
				size: readNumber(obj?.noise?.top_slide?.size, 0),
				offset: readNumber(obj?.noise?.top_slide?.offset, 0),
			},
			bottomSlide: {
				target: readNumber(obj?.noise?.bottom_slide?.target, 0),
				size: readNumber(obj?.noise?.bottom_slide?.size, 0),
				offset: readNumber(obj?.noise?.bottom_slide?.offset, 0),
			},
			useSimplexSurfaceNoise: false,
			randomDensityOffset: false,
			islandNoiseOverride: false,
			isAmplified: false,
		},
	}
}

function readBlockState(obj: any, fallback = BlockState.AIR) {
	if (typeof obj?.Name !== 'string') return fallback
	return new BlockState(obj.Name)
}

function readNumber(obj: any, fallback = 0) {
	return typeof obj === 'number' ? obj : fallback
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

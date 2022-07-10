import { DataModel } from '@mcschema/core'
import { BlockState, clampedMap, DensityFunction } from 'deepslate/worldgen'
import type { Project } from '../contexts/Project.jsx'
import type { VersionId } from '../services/index.js'
import { checkVersion } from '../services/index.js'
import { DEEPSLATE } from './Deepslate.js'
import { NoiseChunkGenerator as OldNoiseChunkGenerator } from './noise/NoiseChunkGenerator.js'

export type NoiseSettingsOptions = {
	biome?: string,
	biomeScale?: number,
	biomeDepth?: number,
	offset: number,
	width: number,
	seed: bigint,
	version: VersionId,
	project: Project,
}

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

export async function noiseSettings(state: any, img: ImageData, options: NoiseSettingsOptions) {
	if (checkVersion(options.version, '1.18')) {
		await DEEPSLATE.loadVersion(options.version, getProjectData(options.project))
		const biomeSource = { type: 'fixed', biome: options.biome }
		await DEEPSLATE.loadChunkGenerator(DataModel.unwrapLists(state), biomeSource, options.seed)
		DEEPSLATE.generateChunks(-options.offset, options.width)
		const noise = DEEPSLATE.getNoiseSettings()

		const data = img.data
		for (let x = 0; x < options.width; x += 1) {
			for (let y = 0; y < noise.height; y += 1) {
				const i = x * 4 + (noise.height-y-1) * 4 * img.width
				const state = DEEPSLATE.getBlockState(x - options.offset, y + noise.minY) ?? BlockState.AIR
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
	return DEEPSLATE.getBlockState(x, y)
}

export async function densityFunction(state: any, img: ImageData, options: NoiseSettingsOptions) {
	await DEEPSLATE.loadVersion(options.version, getProjectData(options.project))
	const fn = DEEPSLATE.loadDensityFunction(DataModel.unwrapLists(state), options.seed)
	const noise = DEEPSLATE.getNoiseSettings()

	const arr = Array(options.width * noise.height)
	let min = Infinity
	let max = -Infinity
	for (let x = 0; x < options.width; x += 1) {
		for (let y = 0; y < noise.height; y += 1) {
			const i = x + (noise.height-y-1) * options.width
			const density = fn.compute(DensityFunction.context(x - options.offset, y, 0))
			min = Math.min(min, density)
			max = Math.max(max, density)
			arr[i] = density
		}
	}

	const data = img.data
	for (let i = 0; i < options.width * noise.height; i += 1) {
		const color = Math.floor(clampedMap(arr[i], min, max, 0, 256))
		data[4 * i] = color
		data[4 * i + 1] = color
		data[4 * i + 2] = color
		data[4 * i + 3] = 255
	}
}

export function getProjectData(project: Project) {
	return Object.fromEntries(['worldgen/noise_settings', 'worldgen/noise', 'worldgen/density_function'].map(type => {
		const resources = Object.fromEntries(
			project.files.filter(file => file.type === type)
				.map<[string, unknown]>(file => [file.id, file.data])
		)
		return [type, resources]
	}))
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

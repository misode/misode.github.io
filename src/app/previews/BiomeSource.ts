import { DataModel } from '@mcschema/core'
import type { Project } from '../contexts/Project.jsx'
import type { VersionId } from '../services/index.js'
import { stringToColor } from '../Utils.js'
import { DEEPSLATE } from './Deepslate.js'
import { getProjectData } from './NoiseSettings.js'

type Triple = [number, number, number]
type BiomeColors = Record<string, Triple>
type BiomeSourceOptions = {
	biomeColors: BiomeColors,
	offset: [number, number],
	scale: number,
	res: number,
	seed: bigint,
	version: VersionId,
	settings: unknown,
	project: Project,
}

export async function biomeMap(state: any, img: ImageData, options: BiomeSourceOptions) {
	await DEEPSLATE.loadVersion(options.version, getProjectData(options.project))
	await DEEPSLATE.loadChunkGenerator(DataModel.unwrapLists(options.settings), DataModel.unwrapLists(state), options.seed)

	const quartStep = Math.max(1, Math.round(options.scale))
	const quartWidth = 200 * quartStep

	const centerX = Math.round(-options.offset[0] * options.scale)
	const centerZ = Math.round(-options.offset[1] * options.scale)

	const minX = Math.floor(centerX - quartWidth / 2)
	const minZ = Math.floor(centerZ - quartWidth / 2)
	const maxX = minX + quartWidth
	const maxZ = minZ + quartWidth

	const { palette, data, width, height } = DEEPSLATE.fillBiomes(minX * 4, maxX * 4, minZ * 4, maxZ * 4, quartStep * options.res)

	let x = 0
	let z = 0
	for (let i = 0; i < data.length; i += 1) {
		const biome = palette.get(data[i])
		const color = getBiomeColor(biome ?? '', options.biomeColors)
		const j = z * width + x
		img.data[j * 4] = color[0]
		img.data[j * 4 + 1] = color[1]
		img.data[j * 4 + 2] = color[2]
		img.data[j * 4 + 3] = 255

		z += 1
		if (z >= height) {
			z = 0
			x += 1
		}
	}
}

export async function getBiome(state: any, x: number, z: number, options: BiomeSourceOptions): Promise<{[k: string]: number | string} | undefined> {
	await DEEPSLATE.loadVersion(options.version, getProjectData(options.project))
	await DEEPSLATE.loadChunkGenerator(DataModel.unwrapLists(options.settings), DataModel.unwrapLists( state), options.seed)

	const quartStep = Math.max(1, Math.round(options.scale))

	const centerX = Math.round(-options.offset[0] * options.scale)
	const centerZ = Math.round(-options.offset[1] * options.scale)

	const xx = Math.floor(centerX + ((x - 100) * quartStep))
	const zz = Math.floor(centerZ + ((z - 100) * quartStep))

	const { palette, data } = DEEPSLATE.fillBiomes(xx * 4, xx * 4 + 4, zz * 4, zz * 4 + 4)
	const biome = palette.get(data[0])!

	return {
		biome,
	}
}

function getBiomeColor(biome: string, biomeColors: BiomeColors): Triple {
	if (!biome) {
		return [128, 128, 128]
	}
	const color = biomeColors[biome] ?? VanillaColors[biome]
	if (color === undefined) {
		return stringToColor(biome)
	}
	return color
}

export const VanillaColors: Record<string, Triple> = {
	'minecraft:badlands': [217,69,21],
	'minecraft:badlands_plateau': [202,140,101],
	'minecraft:bamboo_jungle': [118,142,20],
	'minecraft:bamboo_jungle_hills': [59,71,10],
	'minecraft:basalt_deltas': [64,54,54],
	'minecraft:beach': [250,222,85],
	'minecraft:birch_forest': [48,116,68],
	'minecraft:birch_forest_hills': [31,95,50],
	'minecraft:cold_ocean': [32,32,112],
	'minecraft:crimson_forest': [221,8,8],
	'minecraft:dark_forest': [64,81,26],
	'minecraft:dark_forest_hills': [104,121,66],
	'minecraft:deep_cold_ocean': [32,32,56],
	'minecraft:deep_frozen_ocean': [64,64,144],
	'minecraft:deep_lukewarm_ocean': [0,0,64],
	'minecraft:deep_ocean': [0,0,48],
	'minecraft:deep_warm_ocean': [0,0,80],
	'minecraft:desert': [250,148,24],
	'minecraft:desert_hills': [210,95,18],
	'minecraft:desert_lakes': [255,188,64],
	'minecraft:end_barrens': [39,30,61],
	'minecraft:end_highlands': [232,244,178],
	'minecraft:end_midlands': [194,187,136],
	'minecraft:eroded_badlands': [255,109,61],
	'minecraft:flower_forest': [45,142,73],
	'minecraft:forest': [5,102,33],
	'minecraft:frozen_ocean': [112,112,214],
	'minecraft:frozen_river': [160,160,255],
	'minecraft:giant_spruce_taiga': [129,142,121],
	'minecraft:old_growth_spruce_taiga': [129,142,121],
	'minecraft:giant_spruce_taiga_hills': [109,119,102],
	'minecraft:giant_tree_taiga': [89,102,81],
	'minecraft:old_growth_pine_taiga': [89,102,81],
	'minecraft:giant_tree_taiga_hills': [69,79,62],
	'minecraft:gravelly_hills': [136,136,136],
	'minecraft:gravelly_mountains': [136,136,136],
	'minecraft:windswept_gravelly_hills': [136,136,136],
	'minecraft:ice_spikes': [180,220,220],
	'minecraft:jungle': [83,123,9],
	'minecraft:jungle_edge': [98,139,23],
	'minecraft:sparse_jungle': [98,139,23],
	'minecraft:jungle_hills': [44,66,5],
	'minecraft:lukewarm_ocean': [0,0,144],
	'minecraft:modified_badlands_plateau': [242,180,141],
	'minecraft:modified_gravelly_mountains': [120,152,120],
	'minecraft:modified_jungle': [123,163,49],
	'minecraft:modified_jungle_edge': [138,179,63],
	'minecraft:modified_wooded_badlands_plateau': [216,191,141],
	'minecraft:mountain_edge': [114,120,154],
	'minecraft:extreme_hills': [96,96,96],
	'minecraft:mountains': [96,96,96],
	'minecraft:windswept_hills': [96,96,96],
	'minecraft:mushroom_field_shore': [160,0,255],
	'minecraft:mushroom_fields': [255,0,255],
	'minecraft:nether_wastes': [191,59,59],
	'minecraft:ocean': [0,0,112],
	'minecraft:plains': [141,179,96],
	'minecraft:river': [0,0,255],
	'minecraft:savanna': [189,178,95],
	'minecraft:savanna_plateau': [167,157,100],
	'minecraft:shattered_savanna': [229,218,135],
	'minecraft:windswept_savanna': [229,218,135],
	'minecraft:shattered_savanna_plateau': [207,197,140],
	'minecraft:small_end_islands': [16,12,28],
	'minecraft:snowy_beach': [250,240,192],
	'minecraft:snowy_mountains': [160,160,160],
	'minecraft:snowy_taiga': [49,85,74],
	'minecraft:snowy_taiga_hills': [36,63,54],
	'minecraft:snowy_taiga_mountains': [89,125,114],
	'minecraft:snowy_tundra': [255,255,255],
	'minecraft:snowy_plains': [255,255,255],
	'minecraft:soul_sand_valley': [94,56,48],
	'minecraft:stone_shore': [162,162,132],
	'minecraft:stony_shore': [162,162,132],
	'minecraft:sunflower_plains': [181,219,136],
	'minecraft:swamp': [7,249,178],
	'minecraft:swamp_hills': [47,255,218],
	'minecraft:taiga': [11,102,89],
	'minecraft:taiga_hills': [22,57,51],
	'minecraft:taiga_mountains': [51,142,129],
	'minecraft:tall_birch_forest': [88,156,108],
	'minecraft:old_growth_birch_forest': [88,156,108],
	'minecraft:tall_birch_hills': [71,135,90],
	'minecraft:the_end': [59,39,84],
	'minecraft:the_void': [0,0,0],
	'minecraft:warm_ocean': [0,0,172],
	'minecraft:warped_forest': [73,144,123],
	'minecraft:wooded_badlands_plateau': [176,151,101],
	'minecraft:wooded_badlands': [176,151,101],
	'minecraft:wooded_hills': [34,85,28],
	'minecraft:wooded_mountains': [80,112,80],
	'minecraft:windswept_forest': [80,112,80],
	'minecraft:snowy_slopes': [140, 195, 222],
	'minecraft:lofty_peaks': [196, 168, 193],
	'minecraft:jagged_peaks': [196, 168, 193],
	'minecraft:snowcapped_peaks': [200, 198, 200],
	'minecraft:frozen_peaks': [200, 198, 200],
	'minecraft:stony_peaks': [82, 92, 103],
	'minecraft:grove': [150, 150, 189],
	'minecraft:meadow': [169, 197, 80],
	'minecraft:lush_caves': [112, 255, 79],
	'minecraft:dripstone_caves': [140, 124, 0],
	'minecraft:deep_dark': [10, 14, 19],
	'minecraft:mangrove_swamp': [36,196,142],
}

import { stringToColor } from '../Utils'
import { NormalNoise } from './noise/NormalNoise'

export type BiomeColors =Record<string, number[]>
export type BiomeSourceOptions = {
	biomeColors: BiomeColors,
	offset: [number, number],
	scale: number,
	res: number,
	seed: string,
}

export const NoiseMaps = ['altitude', 'temperature', 'humidity', 'weirdness']

export function biomeSource(state: any, img: ImageData, options: BiomeSourceOptions) {
	switch (state?.type?.replace(/^minecraft:/, '')) {
		case 'multi_noise': return multiNoise(state, img, options)
		case 'fixed': return fixed(state, img, options)
		case 'checkerboard': return checkerboard(state, img, options)
	}
}

function fixed(state: any, img: ImageData, options: BiomeSourceOptions) {
	const data = img.data
	const color = getBiomeColor(state.biome, options.biomeColors)
	const row = img.width * 4 / options.res
	const col = 4 / options.res
	for (let x = 0; x < 200; x += options.res) {
		for (let y = 0; y < 200; y += options.res) {
			const i = y * row + x * col
			data[i] = color[0]
			data[i + 1] = color[1]
			data[i + 2] = color[2]
			data[i + 3] = 255
		}
	}
}

function checkerboard(state: any, img: ImageData, options: BiomeSourceOptions) {
	const biomeColorCache: BiomeColors = {}
	state.biomes?.forEach((b: string) => {
		biomeColorCache[b] = getBiomeColor(b, options.biomeColors)
	})

	const data = img.data
	const ox = -options.offset[0] - 100 + options.res / 2
	const oy = -options.offset[1] - 100 + options.res / 2
	const row = img.width * 4 / options.res
	const col = 4 / options.res
	const shift = (state.scale ?? 2) + 2
	const numBiomes = state.biomes?.length ?? 0
	for (let x = 0; x < 200; x += options.res) {
		for (let y = 0; y < 200; y += options.res) {
			const i = y * row + x * col
			const xx = (x + ox) * options.scale
			const yy = (y + oy) * options.scale
			const j = (((xx >> shift) + (yy >> shift)) % numBiomes + numBiomes) % numBiomes
			const b = state.biomes?.[j]
			const color = biomeColorCache[b] ?? [128, 128, 128]
			data[i] = color[0]
			data[i + 1] = color[1]
			data[i + 2] = color[2]
			data[i + 3] = 255
		}
	}
}

function multiNoise(state: any, img: ImageData, options: BiomeSourceOptions) {
	const noise = NoiseMaps.map((id, i) => {
		const config = state[`${id}_noise`]
		return new NormalNoise(options.seed + i, config.firstOctave, config.amplitudes)
	})

	const biomeColorCache: BiomeColors = {}
	state.biomes.forEach((b: any) => {
		biomeColorCache[b.biome] = getBiomeColor(b.biome, options.biomeColors)
	})

	const data = img.data
	const ox = -options.offset[0] - 100 + options.res / 2
	const oy = -options.offset[1] - 100 + options.res / 2
	const row = img.width * 4 / options.res
	const col = 4 / options.res
	for (let x = 0; x < 200; x += options.res) {
		for (let y = 0; y < 200; y += options.res) {
			const i = y * row + x * col
			const xx = (x + ox) * options.scale
			const yy = (y + oy) * options.scale
			const b = closestBiome(noise, state.biomes, xx, yy)
			const color = biomeColorCache[b] ?? [128, 128, 128]
			data[i] = color[0]
			data[i + 1] = color[1]
			data[i + 2] = color[2]
			data[i + 3] = 255
		}
	}
}

export function getBiome(state: any, x: number, y: number, options: BiomeSourceOptions): string | undefined {
	const [xx, yy] = toWorld([x, y], options)
	switch (state?.type?.replace(/^minecraft:/, '')) {
		case 'multi_noise':
			const noise = NoiseMaps.map((id, i) => {
				const config = state[`${id}_noise`]
				return new NormalNoise(options.seed + i, config.firstOctave, config.amplitudes)
			})
			return closestBiome(noise, state.biomes, xx, yy)
		case 'fixed': return state.biome
		case 'checkerboard':
			const shift = (state.scale ?? 2) + 2
			const numBiomes = state.biomes?.length ?? 0
			const j = (((xx >> shift) + (yy >> shift)) % numBiomes + numBiomes) % numBiomes
			return state.biomes?.[j]
	}
	return undefined
}

export function getBiomeColor(biome: string, biomeColors: BiomeColors) {
	if (!biome) {
		return [128, 128, 128]
	}
	const color = biomeColors[biome] ?? VanillaColors[biome]
	if (color === undefined) {
		return stringToColor(biome)
	}
	return color
}

function toWorld([x, y]: [number, number], options: BiomeSourceOptions) {
	const xx = (x - options.offset[0] - 100 + options.res / 2) * options.scale
	const yy = (y - options.offset[1] - 100 + options.res / 2) * options.scale
	return [xx, yy]
}

function closestBiome(noise: NormalNoise[], biomes: any[], x: number, y: number): string {
	if (!Array.isArray(biomes) || biomes.length === 0) return ''
	const n = noise.map(n => n.getValue(x, y, 0))
	let minDist = Infinity
	let minBiome = ''
	for (const b of biomes) {
		const dist = fitness(b.parameters, {altitude: n[0], temperature: n[1], humidity: n[2], weirdness: n[3], offset: 0})
		if (dist < minDist) {
			minDist = dist
			minBiome = b.biome
		}
	}
	return minBiome
}

function fitness(a: any, b: any) {
	return (a.altitude - b.altitude) * (a.altitude - b.altitude) + (a.temperature - b.temperature) * (a.temperature - b.temperature) + (a.humidity - b.humidity) * (a.humidity - b.humidity) + (a.weirdness - b.weirdness) * (a.weirdness - b.weirdness) + (a.offset - b.offset) * (a.offset - b.offset)
}

const VanillaColors: Record<string, [number, number, number]> = {
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
	'minecraft:end_barrens': [128,128,255],
	'minecraft:end_highlands': [128,128,255],
	'minecraft:end_midlands': [128,128,255],
	'minecraft:eroded_badlands': [255,109,61],
	'minecraft:flower_forest': [45,142,73],
	'minecraft:forest': [5,102,33],
	'minecraft:frozen_ocean': [112,112,214],
	'minecraft:frozen_river': [160,160,255],
	'minecraft:giant_spruce_taiga': [129,142,121],
	'minecraft:giant_spruce_taiga_hills': [109,119,102],
	'minecraft:giant_tree_taiga': [89,102,81],
	'minecraft:giant_tree_taiga_hills': [69,79,62],
	'minecraft:gravelly_mountains': [136,136,136],
	'minecraft:ice_spikes': [180,220,220],
	'minecraft:jungle': [83,123,9],
	'minecraft:jungle_edge': [98,139,23],
	'minecraft:jungle_hills': [44,66,5],
	'minecraft:lukewarm_ocean': [0,0,144],
	'minecraft:modified_badlands_plateau': [242,180,141],
	'minecraft:modified_gravelly_mountains': [120,152,120],
	'minecraft:modified_jungle': [123,163,49],
	'minecraft:modified_jungle_edge': [138,179,63],
	'minecraft:modified_wooded_badlands_plateau': [216,191,141],
	'minecraft:mountain_edge': [114,120,154],
	'minecraft:mountains': [96,96,96],
	'minecraft:mushroom_field_shore': [160,0,255],
	'minecraft:mushroom_fields': [255,0,255],
	'minecraft:nether_wastes': [191,59,59],
	'minecraft:ocean': [0,0,112],
	'minecraft:plains': [141,179,96],
	'minecraft:river': [0,0,255],
	'minecraft:savanna': [189,178,95],
	'minecraft:savanna_plateau': [167,157,100],
	'minecraft:shattered_savanna': [229,218,135],
	'minecraft:shattered_savanna_plateau': [207,197,140],
	'minecraft:small_end_islands': [128,128,255],
	'minecraft:snowy_beach': [250,240,192],
	'minecraft:snowy_mountains': [160,160,160],
	'minecraft:snowy_taiga': [49,85,74],
	'minecraft:snowy_taiga_hills': [36,63,54],
	'minecraft:snowy_taiga_mountains': [89,125,114],
	'minecraft:snowy_tundra': [255,255,255],
	'minecraft:soul_sand_valley': [94,56,48],
	'minecraft:stone_shore': [162,162,132],
	'minecraft:sunflower_plains': [181,219,136],
	'minecraft:swamp': [7,249,178],
	'minecraft:swamp_hills': [47,255,218],
	'minecraft:taiga': [11,102,89],
	'minecraft:taiga_hills': [22,57,51],
	'minecraft:taiga_mountains': [51,142,129],
	'minecraft:tall_birch_forest': [88,156,108],
	'minecraft:tall_birch_hills': [71,135,90],
	'minecraft:the_end': [128,128,255],
	'minecraft:the_void': [0,0,0],
	'minecraft:warm_ocean': [0,0,172],
	'minecraft:warped_forest': [73,144,123],
	'minecraft:wooded_badlands_plateau': [176,151,101],
	'minecraft:wooded_hills': [34,85,28],
	'minecraft:wooded_mountains': [80,112,80],
}

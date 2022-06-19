import { DataModel } from '@mcschema/core'
import type { Project } from '../contexts/Project.jsx'
import type { VersionId } from '../services/index.js'
import { fetchPreset } from '../services/index.js'
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
	DEEPSLATE.loadChunkGenerator(DataModel.unwrapLists(options.settings), DataModel.unwrapLists(state), options.seed)

	const data = img.data
	const minX = -Math.round(options.offset[0]) - 100 + options.res / 2
	const minZ = -Math.round(options.offset[1]) - 100 + options.res / 2
	const row = img.width * 4 / options.res
	const col = 4 / options.res

	const { palette, data: biomes } = DEEPSLATE.fillBiomes(minX * options.scale * 4, (minX + 200) * options.scale * 4, minZ * options.scale * 4, (minZ + 200) * options.scale * 4, options.res * options.scale)

	for (let x = 0; x < 200; x += options.res) {
		for (let z = 0; z < 200; z += options.res) {
			const i = z * row + x * col
			const j = (x / options.res) * 200 / options.res + z / options.res
			let color: Triple = [50, 50, 50]
			const biome = palette.get(biomes[j])
			color = getBiomeColor(biome ?? '', options.biomeColors)
			data[i] = color[0]
			data[i + 1] = color[1]
			data[i + 2] = color[2]
			data[i + 3] = 255
		}
	}
}

export async function getBiome(state: any, x: number, z: number, options: BiomeSourceOptions): Promise<{[k: string]: number | string} | undefined> {
	await DEEPSLATE.loadVersion(options.version, getProjectData(options.project))
	DEEPSLATE.loadChunkGenerator(DataModel.unwrapLists(options.settings), DataModel.unwrapLists( state), options.seed)

	const [xx, zz] = toWorld([x, z], options)

	const { palette, data } = DEEPSLATE.fillBiomes(xx, xx + 4, zz, zz + 4)
	const biome = palette.get(data[0])!

	return {
		biome,
	}
}

/*
async function getCached(state: any, options: BiomeSourceOptions): Promise<{ biomeSource: CachedBiomeSource}> {
	const newState = [state, options.octaves, `${options.seed}`, options.version]
	if (!deepEqual(newState, cacheState)) {
		cacheState = deepClone(newState)

		biomeSourceCache = await getBiomeSource(state, options)
	}
	return {
		biomeSource: biomeSourceCache,
	} 
}

async function getBiomeSource(state: any, options: BiomeSourceOptions): Promise<CachedBiomeSource> {
	switch (state?.type?.replace(/^minecraft:/, '')) {
		case 'fixed':
			return new FixedBiome(Identifier.parse(state.biome as string))

		case 'checkerboard':
			const shift = (state.scale ?? 2) + 2
			const numBiomes = state.biomes?.length ?? 0
			return {
				getBiome(x: number, _y: number, z: number) {
					const i = (((x >> shift) + (z >> shift)) % numBiomes + numBiomes) % numBiomes
					return Identifier.parse(state.biomes?.[i].node as string)
				},
			}

		case 'multi_noise':
			switch(state.preset?.replace(/^minecraft:/, '')) {
				case 'nether':
					state = checkVersion(options.version, '1.18') ? NetherPreset18 : NetherPreset
					break
				case 'overworld':
					state = checkVersion(options.version, '1.18') ? await OverworldPreset18() : state
					break
			}
			state = DataModel.unwrapLists(state)
			if (checkVersion(options.version, '1.18')) {
				await loadWasm()
				const BiomeIds = new BiMap<string, number>()
				const param = (p: number | number[]) => {
					return typeof p === 'number' ? [p, p] : p
				}
				const [t0, t1, h0, h1, c0, c1, e0, e1, w0, w1, d0, d1, o, b] = [[], [], [], [], [], [], [], [], [], [], [], [], [], []] as number[][]
				for (const i of state.biomes) {
					const { temperature, humidity, continentalness, erosion, weirdness, depth, offset } = i.parameters
					t0.push(param(temperature)[0])
					t1.push(param(temperature)[1])
					h0.push(param(humidity)[0])
					h1.push(param(humidity)[1])
					c0.push(param(continentalness)[0])
					c1.push(param(continentalness)[1])
					e0.push(param(erosion)[0])
					e1.push(param(erosion)[1])
					w0.push(param(weirdness)[0])
					w1.push(param(weirdness)[1])
					d0.push(param(depth)[0])
					d1.push(param(depth)[1])
					o.push(offset)
					b.push(BiomeIds.getOrPut(i.biome, Math.floor(Math.random() * 2147483647)))
				}
				const parameters = biome_parameters(new Float64Array(t0), new Float64Array(t1), new Float64Array(h0), new Float64Array(h1), new Float64Array(c0), new Float64Array(c1), new Float64Array(e0), new Float64Array(e1), new Float64Array(w0), new Float64Array(w1), new Float64Array(d0), new Float64Array(d1), new Float64Array(o), new Int32Array(b))
				const sampler = climate_sampler(options.seed, options.octaves.temperature.firstOctave, new Float64Array(options.octaves.temperature.amplitudes), options.octaves.humidity.firstOctave, new Float64Array(options.octaves.humidity.amplitudes), options.octaves.continentalness.firstOctave, new Float64Array(options.octaves.continentalness.amplitudes), options.octaves.erosion.firstOctave, new Float64Array(options.octaves.erosion.amplitudes), options.octaves.weirdness.firstOctave, new Float64Array(options.octaves.weirdness.amplitudes), options.octaves.shift.firstOctave, new Float64Array(options.octaves.shift.amplitudes))
				return {
					getBiome(x, y, z) {
						const ids = multi_noise(parameters, sampler, x, x + 1, 1, y, y + 1, 1, z, z + 1, 1)
						return Identifier.parse(BiomeIds.getA(ids[0]) ?? 'unknown')
					},
					getBiomes(xFrom, xTo, xStep, yFrom, yTo, yStep, zFrom, zTo, zStep) {
						const ids = multi_noise(parameters, sampler, xFrom, xTo, xStep, yFrom, yTo, yStep, zFrom, zTo, zStep)
						return [...ids].map(id => Identifier.parse(BiomeIds.getA(id) ?? 'unknown'))
					},
					getClimate(x, y, z) {
						const climate = climate_noise(sampler, x, x + 1, 1, y, y + 1, 1, z, z + 1, 1)
						const [t, h, c, e, w] = climate.slice(0, 5)
						return {
							temperature: t,
							humidity: h,
							continentalness: c,
							erosion: e,
							weirdness: w,
						}
					},
					getClimates(xFrom, xTo, xStep, yFrom, yTo, yStep, zFrom, zTo, zStep) {
						const climate = climate_noise(sampler, xFrom, xTo, xStep, yFrom, yTo, yStep, zFrom, zTo, zStep)
						const result = []
						for (let i = 0; i < climate.length; i += 7) {
							const [t, h, c, e, w] = climate.slice(i, i + 5)
							result.push({
								temperature: t,
								humidity: h,
								continentalness: c,
								erosion: e,
								weirdness: w,
							})
						}
						return result
					},
				}
			} else {
				const noise = ['altitude', 'temperature', 'humidity', 'weirdness']
					.map((id, i) => {
						const config = state[`${id}_noise`]
						config.firstOctave = clamp(config.firstOctave ?? -7, -100, -1)
						return new NormalNoise(new LegacyRandom(options.seed + BigInt(i)), config)
					})
				if (!Array.isArray(state.biomes) || state.biomes.length === 0) {
					return new FixedBiome(Identifier.create('unknown'))
				}
				return {
					getBiome(x: number, _y: number, z: number): Identifier {
						const n = noise.map(n => n.sample(x, z, 0))
						let minDist = Infinity
						let minBiome = ''
						for (const { biome, parameters: p } of state.biomes) {
							const dist = square(p.altitude - n[0]) + square(p.temperature - n[1]) + square(p.humidity - n[2]) + square(p.weirdness - n[3]) + square(p.offset)
							if (dist < minDist) {
								minDist = dist
								minBiome = biome
							}
						}
						return Identifier.parse(minBiome)
					},
				}
			}
	}
	throw new Error('Unknown biome source')
}
*/

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

function toWorld([x, z]: [number, number], options: BiomeSourceOptions) {
	const xx = (x - options.offset[0] - 100 + options.res / 2) * options.scale
	const zz = (z - options.offset[1] - 100 + options.res / 2) * options.scale
	return [xx, zz]
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
}

const NetherPreset = {type:'minecraft:multi_noise',seed:0,altitude_noise:{firstOctave:-7,amplitudes:[1,1]},temperature_noise:{firstOctave:-7,amplitudes:[1,1]},humidity_noise:{firstOctave:-7,amplitudes:[1,1]},weirdness_noise:{firstOctave:-7,amplitudes:[1,1]},biomes:[{biome:'minecraft:nether_wastes',parameters:{altitude:0,temperature:0,humidity:0,weirdness:0,offset:0}},{biome:'minecraft:soul_sand_valley',parameters:{altitude:0,temperature:0,humidity:-0.5,weirdness:0,offset:0}},{biome:'minecraft:crimson_forest',parameters:{altitude:0,temperature:0.4,humidity:0,weirdness:0,offset:0}},{biome:'minecraft:warped_forest',parameters:{altitude:0,temperature:0,humidity:0.5,weirdness:0,offset:0.375}},{biome:'minecraft:basalt_deltas',parameters:{altitude:0,temperature:-0.5,humidity:0,weirdness:0,offset:0.175}}]}

const NetherPreset18 = {type:'minecraft:multi_noise',biomes:[{biome:'minecraft:nether_wastes',parameters:{temperature:0,humidity:0,continentalness:0,erosion:0,depth:0,weirdness:0,offset:0}},{biome:'minecraft:soul_sand_valley',parameters:{temperature:0,humidity:-0.5,continentalness:0,erosion:0,depth:0,weirdness:0,offset:0}},{biome:'minecraft:crimson_forest',parameters:{temperature:0.4,humidity:0,continentalness:0,erosion:0,depth:0,weirdness:0,offset:0}},{biome:'minecraft:warped_forest',parameters:{temperature:0,humidity:0.5,continentalness:0,erosion:0,depth:0,weirdness:0,offset:0.375}},{biome:'minecraft:basalt_deltas',parameters:{temperature:-0.5,humidity:0,continentalness:0,erosion:0,depth:0,weirdness:0,offset:0.175}}]}

async function OverworldPreset18() {
	const overworld = await fetchPreset('1.18', 'dimension', 'overworld')
	return overworld.generator.biome_source
}

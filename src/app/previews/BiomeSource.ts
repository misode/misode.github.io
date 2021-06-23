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
	const color = biomeColors[biome]
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

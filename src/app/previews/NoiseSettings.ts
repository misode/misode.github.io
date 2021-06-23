import { NoiseChunkGenerator } from './noise/NoiseChunkGenerator'

export type NoiseSettingsOptions = {
	biomeScale: number,
	biomeDepth: number,
	offset: number,
	width: number,
	seed: string,
}

export function noiseSettings(state: any, img: ImageData, options: NoiseSettingsOptions) {
	const generator = new NoiseChunkGenerator(options.seed)
	generator.reset(state, options.biomeDepth, options.biomeScale, options.offset, 200)
	const data = img.data
	const row = img.width * 4
	for (let x = 0; x < options.width; x += 1) {
		const noise = generator.iterateNoiseColumn(x - options.offset).reverse()
		for (let y = 0; y < state.height; y += 1) {
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

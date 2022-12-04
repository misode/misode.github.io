import { DataModel } from '@mcschema/core'
import { clampedMap, NoiseParameters, NormalNoise, XoroshiroRandom } from 'deepslate/worldgen'
import type { VersionId } from '../services/index.js'
import type { ColormapType } from './Colormap.js'
import { getColormap } from './Colormap.js'

export type NoiseOptions = {
	offset: [number, number],
	scale: number,
	seed: bigint,
	version: VersionId,
	colormap: ColormapType,
}

export function normalNoise(state: any, img: ImageData, options: NoiseOptions) {
	const random = XoroshiroRandom.create(options.seed)
	const params = NoiseParameters.fromJson(DataModel.unwrapLists(state))
	const noise = new NormalNoise(random, params)
	
	const colormap = getColormap(options.colormap)
	const ox = -options.offset[0] - 100
	const oy = -options.offset[1] - 100
	const data = img.data
	for (let x = 0; x < 256; x += 1) {
		for (let y = 0; y < 256; y += 1) {
			const i = x * 4 + y * 4 * 256
			const xx = (x + ox) * options.scale
			const yy = (y + oy) * options.scale
			const output = noise.sample(xx, yy, 0)
			const color = colormap(clampedMap(output, -1, 1, 0, 1))
			data[i] = color[0] * 256
			data[i + 1] = color[1] * 256
			data[i + 2] = color[2] * 256
			data[i + 3] = 255
		}
	}
}

export function normalNoisePoint(state: any, x: number, y: number, options: NoiseOptions) {
	const random = XoroshiroRandom.create(options.seed)
	const params = NoiseParameters.fromJson(DataModel.unwrapLists(state))
	const noise = new NormalNoise(random, params)
	
	const ox = -options.offset[0] - 100
	const oy = -options.offset[1] - 100
	const xx = (x + ox) * options.scale
	const yy = (y + oy) * options.scale
	return noise.sample(xx, yy, 0)
}

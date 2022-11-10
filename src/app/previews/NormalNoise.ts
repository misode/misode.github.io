import { DataModel } from '@mcschema/core'
import { NoiseParameters, NormalNoise, XoroshiroRandom } from 'deepslate/worldgen'
import type { VersionId } from '../services/index.js'

export type NoiseOptions = {
	offset: [number, number],
	scale: number,
	seed: bigint,
	version: VersionId,
}

export function normalNoise(state: any, img: ImageData, options: NoiseOptions) {
	const random = XoroshiroRandom.create(options.seed)
	const params = NoiseParameters.fromJson(DataModel.unwrapLists(state))
	const noise = new NormalNoise(random, params)

	const ox = -options.offset[0] - 100
	const oy = -options.offset[1] - 100
	const data = img.data
	for (let x = 0; x < 256; x += 1) {
		for (let y = 0; y < 256; y += 1) {
			const i = x * 4 + y * 4 * 256
			const xx = (x + ox) * options.scale
			const yy = (y + oy) * options.scale
			const color = (noise.sample(xx, yy, 0) + 1) * 128
			data[i] = color
			data[i + 1] = color
			data[i + 2] = color
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

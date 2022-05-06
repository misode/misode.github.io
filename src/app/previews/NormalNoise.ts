import { DataModel } from '@mcschema/core'
import { LegacyRandom, NoiseParameters, NormalNoise } from 'deepslate/worldgen'
import type { VersionId } from '../services'

export type NoiseOptions = {
	offset: [number, number],
	scale: number,
	seed: bigint,
	version: VersionId,
}

export function normalNoise(state: any, img: ImageData, options: NoiseOptions) {
	const random = new LegacyRandom(options.seed)
	const params = NoiseParameters.fromJson(DataModel.unwrapLists(state))
	const noise = new NormalNoise(random, params)

	const ox = -options.offset[0] - 100
	const oz = -options.offset[1] - 100
	const data = img.data
	for (let x = 0; x < 256; x += 1) {
		for (let y = 0; y < 256; y += 1) {
			const i = x * 4 + y * 4 * 256
			const xx = (x + ox) * options.scale
			const yy = (y + oz) * options.scale
			const color = (noise.sample(xx, yy, 0) + 1) * 128
			data[i] = color
			data[i + 1] = color
			data[i + 2] = color
			data[i + 3] = 255
		}
	}
}

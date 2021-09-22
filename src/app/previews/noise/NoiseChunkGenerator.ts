import { PerlinNoise, Random } from 'deepslate'
import { clampedLerp, lerp2 } from '../../Utils'

export class NoiseChunkGenerator {
	private readonly minLimitPerlinNoise: PerlinNoise
	private readonly maxLimitPerlinNoise: PerlinNoise
	private readonly mainPerlinNoise: PerlinNoise
	private readonly depthNoise: PerlinNoise

	private settings: any = {}
	private chunkWidth: number = 4
	private chunkHeight: number = 4
	private chunkCountY: number = 32
	private biomeDepth: number = 0.1
	private biomeScale: number = 0.2

	private noiseColumnCache: (number[] | null)[] = []
	private xOffset: number = 0

	constructor(seed: bigint) {
		const random = new Random(seed)
		this.minLimitPerlinNoise = new PerlinNoise(random, -15, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
		this.maxLimitPerlinNoise = new PerlinNoise(random, -15, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
		this.mainPerlinNoise = new PerlinNoise(random, -7, [1, 1, 1, 1, 1, 1, 1, 1])
		this.depthNoise = new PerlinNoise(random, -15, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
	}

	public reset(settings: any, depth: number, scale: number, xOffset: number, width: number) {
		this.settings = settings
		this.chunkWidth = settings.size_horizontal * 4
		this.chunkHeight = settings.size_vertical * 4
		this.chunkCountY = Math.floor(settings.height / this.chunkHeight)

		if (settings.amplified && depth > 0) {
			depth = 1 + depth * 2
			scale = 1 + scale * 4
		}
		this.biomeDepth = 0.265625 * (depth * 0.5 - 0.125)
		this.biomeScale = 96.0 / (scale * 0.9 + 0.1)

		this.noiseColumnCache = Array(width).fill(null)
		this.xOffset = xOffset
	}
  
	public iterateNoiseColumn(x: number): number[] {
		const data = Array(this.chunkCountY * this.chunkHeight)
		const cx = Math.floor(x / this.chunkWidth)
		const ox = Math.floor(x % this.chunkWidth) / this.chunkWidth
		const noise1 = this.fillNoiseColumn(cx)
		const noise2 = this.fillNoiseColumn(cx + 1)

		for (let y = this.chunkCountY - 1; y >= 0; y -= 1) {
			for (let yy = this.chunkHeight; yy >= 0; yy -= 1) {
				const oy = yy / this.chunkHeight
				const i = y * this.chunkHeight + yy
				data[i] = lerp2(oy, ox, noise1[y], noise1[y+1], noise2[y], noise2[y+1])
			}
		}
		return data
	}

	private fillNoiseColumn(x: number): number[] {
		const cachedColumn = this.noiseColumnCache[x - this.xOffset]
		if (cachedColumn) return cachedColumn

		const data = Array(this.chunkCountY + 1)

		const xzScale = 684.412 * this.settings.sampling.xz_scale
		const yScale = 684.412 * this.settings.sampling.y_scale
		const xzFactor = xzScale / this.settings.sampling.xz_factor
		const yFactor = yScale / this.settings.sampling.y_factor
		const randomDensity = this.settings.random_density_offset ? this.getRandomDensity(x) : 0

		for (let y = 0; y <= this.chunkCountY; y += 1) {
			let noise = this.sampleAndClampNoise(x, y, this.mainPerlinNoise.getOctaveNoise(0)!.zo, xzScale, yScale, xzFactor, yFactor)
			const yOffset = 1 - y * 2 / this.chunkCountY + randomDensity
			const density = yOffset * this.settings.density_factor + this.settings.density_offset
			const falloff = (density + this.biomeDepth) * this.biomeScale
			noise += falloff * (falloff > 0 ? 4 : 1)

			if (this.settings.top_slide.size > 0) {
				noise = clampedLerp(
					this.settings.top_slide.target,
					noise,
					(this.chunkCountY - y - (this.settings.top_slide.offset)) / (this.settings.top_slide.size)
				)
			}

			if (this.settings.bottom_slide.size > 0) {
				noise = clampedLerp(
					this.settings.bottom_slide.target,
					noise,
					(y - (this.settings.bottom_slide.offset)) / (this.settings.bottom_slide.size)
				)
			}
			data[y] = noise
		}

		this.noiseColumnCache[x - this.xOffset] = data
		return data
	}

	private getRandomDensity(x: number): number {
		const noise = this.depthNoise.sample(x * 200, 10, this.depthNoise.getOctaveNoise(0)!.zo, 1, 0, true)
		const a = (noise < 0) ? -noise * 0.3 : noise
		const b = a * 24.575625 - 2
		return (b < 0) ? b * 0.009486607142857142 : Math.min(b, 1) * 0.006640625
	}

	private sampleAndClampNoise(x: number, y: number, z: number, xzScale: number, yScale: number, xzFactor: number, yFactor: number): number {
		let a = 0
		let b = 0
		let c = 0
		let d = 1

		for (let i = 0; i < 16; i += 1) {
			const x2 = PerlinNoise.wrap(x * xzScale * d)
			const y2 = PerlinNoise.wrap(y * yScale * d)
			const z2 = PerlinNoise.wrap(z * xzScale * d)
			const e = yScale * d

			const minLimitNoise = this.minLimitPerlinNoise.getOctaveNoise(i)
			if (minLimitNoise) {
				a += minLimitNoise.sample(x2, y2, z2, e, y * e) / d
			}

			const maxLimitNoise = this.maxLimitPerlinNoise.getOctaveNoise(i)
			if (maxLimitNoise) {
				b += maxLimitNoise.sample(x2, y2, z2, e, y * e) / d
			}

			if (i < 8) {
				const mainNoise = this.mainPerlinNoise.getOctaveNoise(i)
				if (mainNoise) {
					c += mainNoise.sample(
						PerlinNoise.wrap(x * xzFactor * d),
						PerlinNoise.wrap(y * yFactor * d),
						PerlinNoise.wrap(z * xzFactor * d),
						yFactor * d,
						y * yFactor * d 
					) / d
				}
			}

			d /= 2
		}

		return clampedLerp(a / 512, b / 512, (c / 10 + 1) / 2)
	}
}

import { PerlinNoise } from './math/PerlinNoise'
import { clampedLerp, hexId, lerp2 } from '../Utils'

export class NoiseChunkGenerator {
  private minLimitPerlinNoise: PerlinNoise
  private maxLimitPerlinNoise: PerlinNoise
  private mainPerlinNoise: PerlinNoise
  private depthNoise: PerlinNoise

  private chunkWidth: number = 4
  private chunkHeight: number = 4
  private chunkCountY: number = 32

  constructor(private state: any, private depth: number, private scale: number) {
    this.minLimitPerlinNoise = PerlinNoise.fromRange(hexId(), -15, 0)
    this.maxLimitPerlinNoise = PerlinNoise.fromRange(hexId(), -15, 0)
    this.mainPerlinNoise = PerlinNoise.fromRange(hexId(), -7, 0)
    this.depthNoise = PerlinNoise.fromRange(hexId(), -15, 0)
    
    this.chunkWidth = state.size_horizontal * 4
    this.chunkHeight = state.size_vertical * 4
    this.chunkCountY = Math.floor(state.height / this.chunkHeight)
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
        data[i] = lerp2(oy, ox, noise1[y], noise1[y+1], noise2[y], noise2[y+1]);
      }
    }
    return data
  }

  private fillNoiseColumn(x: number): number[] {
    const data = Array(this.chunkCountY + 1)

    let scaledDepth = 0.265625 * this.depth
    let scaledScale = 96 / this.scale
    const xzScale = 684.412 * this.state.sampling.xz_scale
    const yScale = 684.412 * this.state.sampling.y_scale
    const xzFactor = xzScale / this.state.sampling.xz_factor
    const yFactor = yScale / this.state.sampling.y_factor
    const randomDensity = this.state.random_density_offset ? this.getRandomDensity(x) : 0

    for (let y = 0; y <= this.chunkCountY; y += 1) {
      let noise = this.sampleAndClampNoise(x, y, this.mainPerlinNoise.getOctaveNoise(0).zo, xzScale, yScale, xzFactor, yFactor)
      const yOffset = 1 - y * 2 / this.chunkCountY + randomDensity
      const density = yOffset * this.state.density_factor + this.state.density_offset
      const falloff = (density + scaledDepth) * scaledScale
      noise += falloff * (falloff > 0 ? 4 : 1)

      if (this.state.top_slide.size > 0) {
        noise = clampedLerp(
          this.state.top_slide.target,
          noise,
          (this.chunkCountY - y - (this.state.top_slide.offset)) / (this.state.top_slide.size)
        )
      }

      if (this.state.bottom_slide.size > 0) {
        noise = clampedLerp(
          this.state.bottom_slide.target,
          noise,
          (y - (this.state.bottom_slide.offset)) / (this.state.bottom_slide.size)
        )
      }
      data[y] = noise
    }
    return data
  }

  private getRandomDensity(x: number): number {
    const noise = this.depthNoise.getValue(x * 200, 10, this.depthNoise.getOctaveNoise(0).zo, 1, 0, true)
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
        a += minLimitNoise.noise(x2, y2, z2, e, y * e) / d
      }

      const maxLimitNoise = this.maxLimitPerlinNoise.getOctaveNoise(i)
      if (maxLimitNoise) {
        b += maxLimitNoise.noise(x2, y2, z2, e, y * e) / d
      }

      if (i < 8) {
        const mainNoise = this.mainPerlinNoise.getOctaveNoise(i)
        if (mainNoise) {
          c += mainNoise.noise(
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

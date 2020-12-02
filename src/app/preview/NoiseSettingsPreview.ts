import { DataModel, Path, ModelPath } from "@mcschema/core"
import { Preview } from './Preview'
import { toggleMenu, View } from '../views/View'
import { Octicon } from '../components/Octicon'
import { clampedLerp, hexId, lerp2 } from '../Utils'
import { PerlinNoise } from './PerlinNoise'

export class NoiseSettingsPreview extends Preview {
  private minLimitPerlinNoise: PerlinNoise
  private maxLimitPerlinNoise: PerlinNoise
  private mainPerlinNoise: PerlinNoise
  private depthNoise: PerlinNoise
  private width: number = 512
  private chunkWidth: number = 4
  private chunkHeight: number = 4
  private chunkCountY: number = 32
  private offsetX: number = 0
  private debug: boolean = false
  private depth: number = 0.1
  private scale: number = 0.2

  constructor() {
    super()
    this.minLimitPerlinNoise = PerlinNoise.fromRange(hexId(), -15, 0)
    this.maxLimitPerlinNoise = PerlinNoise.fromRange(hexId(), -15, 0)
    this.mainPerlinNoise = PerlinNoise.fromRange(hexId(), -7, 0)
    this.depthNoise = PerlinNoise.fromRange(hexId(), -15, 0)
  }

  getName() {
    return 'noise-settings'
  }

  active(path: ModelPath) {
    return path.endsWith(new Path(['noise']))
  }

  menu(view: View, redraw: () => void) {
    return `<div class="panel-menu">
      <div class="btn" data-id="${view.onClick(toggleMenu)}">
        ${Octicon.kebab_horizontal}
      </div>
      <div class="panel-menu-list btn-group">
        <div class="btn input">
          ${Octicon.gear}
          <label data-i18n="preview.depth"></label>
          <input type="number" step="0.1" data-id="${view.register(el => {
            (el as HTMLInputElement).value = this.depth.toString()
            el.addEventListener('change', () => {
              this.depth = parseFloat((el as HTMLInputElement).value)
              redraw()
            })
          })}">
        </div>
        <div class="btn input">
          ${Octicon.gear}
          <label data-i18n="preview.scale"></label>
          <input type="number" step="0.1" data-id="${view.register(el => {
            (el as HTMLInputElement).value = this.scale.toString()
            el.addEventListener('change', () => {
              this.scale = parseFloat((el as HTMLInputElement).value)
              redraw()
            })
          })}">
        </div>
        <div class="btn input">
          ${Octicon.arrow_both}
          <label data-i18n="preview.width"></label>
          <input type="number" step="16" data-id="${view.register(el => {
            (el as HTMLInputElement).value = this.width.toString()
            el.addEventListener('change', () => {
              this.width = parseFloat((el as HTMLInputElement).value)
              redraw()
            })
          })}">
        </div>
        <div class="btn" data-id="${view.onClick(() => {this.debug = !this.debug; redraw()})}">
          ${Octicon.square}
          <span data-i18n="preview.show_density"></span>
        </div>
      </div>
    </div>`
  }

  getSize(): [number, number] {
    return [this.width, this.state.height]
  }

  draw(model: DataModel, img: ImageData) {
    this.chunkWidth = this.state.size_horizontal * 4
    this.chunkHeight = this.state.size_vertical * 4
    this.chunkCountY = Math.floor(this.state.height / this.chunkHeight)

    const data = img.data
    for (let x = 0; x < this.width; x += 1) {
      const noise = this.iterateNoiseColumn(x - this.offsetX).reverse()
      for (let y = 0; y < this.state.height; y += 1) {
        const i = (y * (img.width * 4)) + (x * 4)
        const color = this.getColor(noise, y)
        data[i] = (this.debug && noise[y] > 0) ? 255 : color
        data[i + 1] = color
        data[i + 2] = color
        data[i + 3] = 255
      }
    }
  }

  onDrag(dx: number, dy: number) {
    this.offsetX += dx
  }

  private getColor(noise: number[], y: number): number {
    if (this.debug) {
      return -noise[y] / 2 + 128
    }
    if (noise[y] > 0) {
      return 0
    }
    if (noise[y+1] > 0) {
      return 150
    }
    return 255
  }

  private iterateNoiseColumn(x: number): number[] {
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

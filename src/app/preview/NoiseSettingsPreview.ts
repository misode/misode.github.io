import SimplexNoise from 'simplex-noise'
import { DataModel, Path, ModelPath } from "@mcschema/core"
import { Preview } from './Preview'
import { toggleMenu, View } from '../views/View'
import { Octicon } from '../components/Octicon'

export class NoiseSettingsPreview extends Preview {
  private noise: SimplexNoise
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
    this.noise = new SimplexNoise()
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
          ${this.debug ? Octicon.square_fill : Octicon.square}
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
        data[i] = this.lerp2(oy, ox, noise1[y], noise1[y+1], noise2[y], noise2[y+1]);
      }
    }
    return data
  }

  private fillNoiseColumn(x: number): number[] {
    const data = Array(this.chunkCountY + 1)

    const scaledDepth = 0.265625 * this.depth
    const scaledScale = 96 / this.scale

    for (let y = 0; y <= this.chunkCountY; y += 1) {
      let noise = this.getNoise(x, y)
      const yOffset = 1 - y * 2 / this.chunkCountY
      const density = yOffset * this.state.density_factor + this.state.density_offset
      const falloff = (density + scaledDepth) * scaledScale
      noise += falloff * (falloff > 0 ? 4 : 1)

      if (this.state.top_slide.size > 0) {
        noise = this.clampedLerp(
          this.state.top_slide.target,
          noise,
          (this.chunkCountY - y - (this.state.top_slide.offset)) / (this.state.top_slide.size)
        )
      }

      if (this.state.bottom_slide.size > 0) {
        noise = this.clampedLerp(
          this.state.bottom_slide.target,
          noise,
          (y - (this.state.bottom_slide.offset)) / (this.state.bottom_slide.size)
        )
      }
      data[y] = noise
    }
    return data
  }

  private getNoise(x: number, y: number): number {
    const octaves = [ [64, 1], [32, 2], [16, 4], [8, 8], [4, 16] ]
    return octaves
      .map(o => this.noise.noise2D(x / o[0], y / o[0]) / o[1])
      .reduce((prev, acc) => prev + acc) * 256
  }

  private clampedLerp(a: number, b: number, c: number): number {
    if (c < 0) {
      return a;
    } else if (c > 1) {
      return b
    } else {
      return this.lerp(c, a, b)
    }
  }

  public lerp(a: number, b: number, c: number): number {
    return b + a * (c - b);
  }

  public lerp2(a: number, b: number, c: number, d: number, e: number, f: number): number {
      return this.lerp(b, this.lerp(a, c, d), this.lerp(a, e, f));
  }
}

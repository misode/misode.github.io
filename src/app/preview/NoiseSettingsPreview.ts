import { DataModel, Path, ModelPath } from "@mcschema/core"
import { Preview } from './Preview'
import { toggleMenu, View } from '../views/View'
import { Octicon } from '../components/Octicon'
import { NoiseChunkGenerator } from './noise/NoiseChunkGenerator'

export class NoiseSettingsPreview extends Preview {
  private width: number = 256
  private depth: number = 0.1
  private scale: number = 0.2
  private offsetX: number = 0
  private debug: boolean = false
  private generator: NoiseChunkGenerator

  constructor() {
    super()
    this.generator = new NoiseChunkGenerator()
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
    return [this.width, this.state.height / 2]
  }

  draw(model: DataModel, img: ImageData) {
    this.generator.reset(this.state, this.depth, this.scale)
    const data = img.data
    for (let x = 0; x < this.width; x += 1) {
      const noise = this.generator.iterateNoiseColumn(x - this.offsetX).reverse()
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
}

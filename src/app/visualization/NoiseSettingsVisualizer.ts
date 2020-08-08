import SimplexNoise from 'simplex-noise'
import { DataModel, Path } from "@mcschema/core"
import { Visualizer } from './Visualizer'

const debug = false

export class NoiseSettingsVisualizer extends Visualizer {
  private noise: SimplexNoise
  private offsetX: number

  constructor() {
    super()
    this.noise = new SimplexNoise()
    this.offsetX = 0
  }

  onPath(path: Path) {
    return path.equals(new Path(['generator', 'settings', 'noise']))
      || path.equals(new Path(['noise']))
  }

  active(model: DataModel) {
    return true
  }

  getState(model: DataModel) {
    return model.get(new Path(['generator', 'settings', 'noise']))
      ?? model.get(new Path(['noise']))
  }

  onDrag(from: number[], to: number[]) {
    this.offsetX += (to[0] - from[0])
  }

  draw(model: DataModel, img: ImageData) {
    const data = img.data
    for (let x = 0; x < 200; x += 1) {
      const densities = this.fillNoiseColumn(x - this.offsetX).reverse()
      for (let y = 0; y < 100; y += 1) {
        const i = (y * (img.width * 4)) + (x * 4)
        const color = this.getColor(densities, y)
        data[i] = (debug && densities[y] > 0) ? 255 : color
        data[i + 1] = color
        data[i + 2] = color
        data[i + 3] = 255
      }
    }
  }

  private getColor(densities: number[], y: number): number {
    if (debug) {
      return -densities[y] * 128 + 128
    }
    if (densities[y] > 0) {
      return 0
    }
    if (densities[y+1] > 0) {
      return 150
    }
    return 255
  }

  private fillNoiseColumn(x: number) {
    const data = Array(100)
    for (let y = 0; y < 100; y += 1) {
      let density = this.getNoise(x, y)
      density = density < -1 ? -1 : density > 1 ? 1 : density 

      const heightFactor = (1 - y / 50) * this.state.density_factor + this.state.density_offset
      density += heightFactor * (heightFactor > 0 ? 16 : 4)

      if (this.state.top_slide.size > 0) {
        density = this.clampedLerp(
          this.state.top_slide.target / 100,
          density,
          (100 - y - (this.state.top_slide.offset * 4)) / (this.state.top_slide.size * 4)
        )
      }

      if (this.state.bottom_slide.size > 0) {
        density = this.clampedLerp(
          this.state.bottom_slide.target / 100,
          density,
          (y - (this.state.bottom_slide.offset * 4)) / (this.state.bottom_slide.size * 4)
        )
      }
      data[y] = density
    }
    return data
  }

  private getNoise(x: number, y: number) {
    const octaves = [ [64, 1], [32, 2], [16, 4], [8, 8], [4, 16] ]
    return octaves
      .map(o => this.noise.noise2D(x / o[0], y / o[0]) / o[1])
      .reduce((prev, acc) => prev + acc)
  }

  private clampedLerp(a: number, b: number, c: number): number {
    if (c < 0) {
      return a;
    } else if (c > 1) {
      return b
    } else {
      return a + c * (b - a);
    }
  }
}

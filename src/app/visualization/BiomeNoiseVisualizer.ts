import SimplexNoise from 'simplex-noise'
import { DataModel, Path } from "@mcschema/core"
import { Visualizer } from './Visualizer'


export class BiomeNoiseVisualizer extends Visualizer {
  static readonly noiseMaps = ['altitude', 'temperature', 'humidity', 'weirdness']
  static readonly path = new Path(['generator', 'biome_source'])
  private noise: SimplexNoise[]
  private offsetX: number = 0
  private offsetY: number = 0

  constructor() {
    super()
    this.noise = BiomeNoiseVisualizer.noiseMaps.map(e => new SimplexNoise())
  }

  onPath(path: Path) {
    return path.equals(BiomeNoiseVisualizer.path)
  }

  active(model: DataModel) {
    return model.get(BiomeNoiseVisualizer.path) !== undefined
      && model.get(BiomeNoiseVisualizer.path.push('type')) === 'minecraft:multi_noise'
  }

  getState(model: DataModel) {
    return model.get(BiomeNoiseVisualizer.path)
  }

  draw(model: DataModel, img: ImageData) {
    const data = img.data
    for (let x = 0; x < 200; x += 1) {
      for (let y = 0; y < 100; y += 1) {
        const i = (y * (img.width * 4)) + (x * 4)
        const b = this.closestBiome(x, y)
        const color = this.colorFromBiome(b)
        data[i] = color[0]
        data[i + 1] = color[1]
        data[i + 2] = color[2]
        data[i + 3] = 255
      }
    }
  }

  onDrag(from: number[], to: number[]) {
    this.offsetX += (to[0] - from[0]) / 128
    this.offsetY += (to[1] - from[1]) / 128
  }

  private closestBiome(x: number, y: number): string {
    const noise = this.getNoise(x, y)
    if (!this.state.biomes) return ''

    return this.state.biomes
      .map((b: any) => ({
        biome: b.biome ?? '',
        distance: this.distance([...noise, 0], [...BiomeNoiseVisualizer.noiseMaps.map(s => b.parameters[s]), b.parameters.offset])
      }))
      .sort((a: any, b: any) => a.distance - b.distance)
      [0].biome
  }

  private distance(a: number[], b: number[]) {
    let d = 0
    for (let i = 0; i < a.length; i ++) {
      d += (a[i]-b[i]) * (a[i]-b[i])
    }
    return d
  }

  private getNoise(x: number, y: number): number[] {
    return BiomeNoiseVisualizer.noiseMaps.map((id, index) => {
      const config = this.state[`${id}_noise`]
      let n = 0
      let scale = 2**config.firstOctave
      for (let i = 0; i < config.amplitudes.length; i++) {
        n += this.noise[index].noise2D(x*scale - this.offsetX, y*scale + i - this.offsetY)
          * config.amplitudes[i] * 128 / scale
        scale *= 2
      }
      return n
    })
  }

  private colorFromBiome(biome: string): number[] {
    const h = Math.abs(this.hash(biome))
    return [h % 256, (h >> 8) % 256, (h >> 16) % 256]
  }

  private hash(s: string) {
    return s.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)
  }
}

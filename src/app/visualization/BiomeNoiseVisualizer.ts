import SimplexNoise from 'simplex-noise'
import { DataModel, Path, ModelPath } from "@mcschema/core"
import { Visualizer } from './Visualizer'
import { VisualizerView } from './VisualizerView'


export class BiomeNoiseVisualizer extends Visualizer {
  static readonly noiseMaps = ['altitude', 'temperature', 'humidity', 'weirdness']
  private noise: SimplexNoise[]
  private offsetX: number = 0
  private offsetY: number = 0
  private viewScale: number = 0
  private biomeColors: {[id: string]: number[]} = {}

  constructor() {
    super()
    this.noise = BiomeNoiseVisualizer.noiseMaps.map(e => new SimplexNoise())
  }

  getName() {
    return 'biome-noise'
  }

  active(path: ModelPath) {
    return path.endsWith(new Path(['generator', 'biome_source']))
      && path.push('type').get() === 'minecraft:multi_noise'
  }

  draw(model: DataModel, img: ImageData) {
    const data = img.data
    const s = (2 ** this.viewScale)
    for (let x = 0; x < 200; x += 1) {
      for (let y = 0; y < 100; y += 1) {
        const i = (y * (img.width * 4)) + (x * 4)
        const xx = (x - this.offsetX) * s - 100 * s
        const yy = (y- this.offsetY) * s - 50 * s
        const b = this.closestBiome(xx, yy)
        const color = this.getBiomeColor(b)
        data[i] = color[0]
        data[i + 1] = color[1]
        data[i + 2] = color[2]
        data[i + 3] = 255
      }
    }
  }

  onDrag(fromX: number, fromY: number, toX: number, toY: number) {
    this.offsetX += toX - fromX
    this.offsetY += toY - fromY
  }

  addControls(el: HTMLElement, view: VisualizerView) {
    el.insertAdjacentHTML('beforeend', `<button class="btn" id="visualizer-controls-toggle"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"></path></svg></button><button class="btn" id="visualizer-controls-toggle"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M2 8a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H2.75A.75.75 0 012 8z"></path></svg></button>`)
    el.childNodes[0].addEventListener('click', () => {
      this.viewScale -= 0.5
      view.redraw()
    })
    el.childNodes[1].addEventListener('click', () => {
      this.viewScale += 0.5
      view.redraw()
    })
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
        n += this.noise[index].noise2D(x * scale, y * scale + i)
        * config.amplitudes[i] / (2**scale)
        scale *= 2
      }
      return n / config.amplitudes.length
    })
  }

  getBiomeColor(biome: string): number[] {
    const color = this.biomeColors[biome]
    if (color === undefined) {
      return this.colorFromBiome(biome)
    }
    return color
  }

  setBiomeColor(biome: string, value: string) {
    this.biomeColors[biome] = [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16)]
  }

  getBiomeHex(biome: string): string {
    return '#' + this.getBiomeColor(biome).map(e => e.toString(16).padStart(2, '0')).join('')
  }

  private colorFromBiome(biome: string): number[] {
    const h = Math.abs(this.hash(biome))
    return [h % 256, (h >> 8) % 256, (h >> 16) % 256]
  }

  private hash(s: string) {
    return (s ?? '').split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)
  }
}

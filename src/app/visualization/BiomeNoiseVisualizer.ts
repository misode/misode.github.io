import { DataModel, Path, ModelPath } from "@mcschema/core"
import { NormalNoise } from './NormalNoise'
import { Visualizer } from './Visualizer'
import { VisualizerView } from './VisualizerView'

const LOCAL_STORAGE_BIOME_COLORS = 'biome_colors'

export class BiomeNoiseVisualizer extends Visualizer {
  static readonly noiseMaps = ['altitude', 'temperature', 'humidity', 'weirdness']
  private seed: string
  private noise: NormalNoise[]
  private offsetX: number = 0
  private offsetY: number = 0
  private viewScale: number = 0
  private biomeColors: { [id: string]: number[] }

  constructor() {
    super()
    this.seed = this.hexId()
    this.biomeColors = JSON.parse(localStorage.getItem(LOCAL_STORAGE_BIOME_COLORS) ?? '{}')
    this.noise = []
  }

  getName() {
    return 'biome-noise'
  }

  active(path: ModelPath) {
    return path.endsWith(new Path(['generator', 'biome_source']))
      && path.push('type').get() === 'minecraft:multi_noise'
  }

  draw(model: DataModel, img: ImageData) {
    this.noise = BiomeNoiseVisualizer.noiseMaps.map((id, i) => {
      const config = this.state[`${id}_noise`]
      return new NormalNoise(this.seed + i, config.firstOctave, config.amplitudes)
    })

    const biomeColorCache: {[key: string]: number[]} = {}
    this.state.biomes.forEach((b: any) => {
      biomeColorCache[b.biome] = this.getBiomeColor(b.biome)
    })

    const data = img.data
    const s = (2 ** this.viewScale)
    for (let x = 0; x < 200; x += 1) {
      for (let y = 0; y < 100; y += 1) {
        const i = (y * (img.width * 4)) + (x * 4)
        const xx = (x - this.offsetX) * s - 100 * s
        const yy = (y - this.offsetY) * s - 50 * s
        const b = this.closestBiome(xx, yy)
        const color = biomeColorCache[b]
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
    if (!this.state.biomes) return ''
    const noise = this.noise.map(n => n.getValue(x, y))
    let minDist = Infinity
    let minBiome = ''
    for (const b of this.state.biomes) {
      const dist = this.fitness(b.parameters, {altitude: noise[0], temperature: noise[1], humidity: noise[2], weirdness: noise[3], offset: 0})
      if (dist < minDist) {
        minDist = dist
        minBiome = b.biome
      }
    }
    return minBiome
  }

  private fitness(a: any, b: any) {
    return (a.altitude - b.altitude) * (a.altitude - b.altitude) + (a.temperature - b.temperature) * (a.temperature - b.temperature) + (a.humidity - b.humidity) * (a.humidity - b.humidity) + (a.weirdness - b.weirdness) * (a.weirdness - b.weirdness) + (a.offset - b.offset) * (a.offset - b.offset)
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
    localStorage.setItem(LOCAL_STORAGE_BIOME_COLORS, JSON.stringify(this.biomeColors))
  }

  getBiomeHex(biome: string): string {
    return '#' + this.getBiomeColor(biome).map(e => e.toString(16).padStart(2, '0')).join('')
  }

  private colorFromBiome(biome: string): number[] {
    const h = Math.abs(this.hash(biome))
    return [h % 256, (h >> 8) % 256, (h >> 16) % 256]
  }

  private hash(s: string) {
    return (s ?? '').split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0)
  }

  private dec2hex(dec: number) {
    return ('0' + dec.toString(16)).substr(-2)
  }

  private hexId(length = 12) {
    var arr = new Uint8Array(length / 2)
    window.crypto.getRandomValues(arr)
    return Array.from(arr, this.dec2hex).join('')
  }
}

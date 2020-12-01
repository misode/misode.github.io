import { DataModel, Path, ModelPath } from "@mcschema/core"
import { Octicon } from "../components/Octicon"
import { Property } from "../state/Property"
import { hashString, hexId } from "../Utils"
import { View } from "../views/View"
import { NormalNoise } from './NormalNoise'
import { Preview } from './Preview'

const LOCAL_STORAGE_BIOME_COLORS = 'biome_colors'

export class BiomeNoisePreview extends Preview {
  static readonly noiseMaps = ['altitude', 'temperature', 'humidity', 'weirdness']
  private noise: NormalNoise[]
  seed: string
  offsetX: number = 0
  offsetY: number = 0
  viewScale: number = 0
  biomeColors: Property<{ [id: string]: number[] }>

  constructor() {
    super()
    this.seed = hexId()
    this.biomeColors = new Property({})
    this.biomeColors.set(JSON.parse(localStorage.getItem(LOCAL_STORAGE_BIOME_COLORS) ?? '{}'))
    this.noise = []
  }

  getName() {
    return 'biome-noise'
  }

  active(path: ModelPath) {
    return path.endsWith(new Path(['generator', 'biome_source']))
      && path.push('type').get() === 'minecraft:multi_noise'
  }

  menu(view: View, redraw: () => void) {
    return `
      <div class="btn" data-id="${view.onClick(() => {
        this.viewScale -= 0.5
        redraw()
      })}">
        ${Octicon.plus}
      </div>
      <div class="btn" data-id="${view.onClick(() => {
        this.viewScale += 0.5
        redraw()
      })}">
        ${Octicon.dash}
      </div>`
  }

  getSize(): [number, number] {
    return [200, 100]
  }

  draw(model: DataModel, img: ImageData) {
    this.noise = BiomeNoisePreview.noiseMaps.map((id, i) => {
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
        const color = biomeColorCache[b] ?? [128, 128, 128]
        data[i] = color[0]
        data[i + 1] = color[1]
        data[i + 2] = color[2]
        data[i + 3] = 255
      }
    }
  }

  onDrag(dx: number, dy: number) {
    this.offsetX += dx
    this.offsetY += dy
  }

  private closestBiome(x: number, y: number): string {
    if (!this.state.biomes || this.state.biomes.length === 0) return ''
    const noise = this.noise.map(n => n.getValue(x, y, 0))
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
    const color = this.biomeColors.get()[biome]
    if (color === undefined) {
      return this.colorFromBiome(biome)
    }
    return color
  }

  setBiomeColor(biome: string, value: string) {
    const color = [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16)]
    this.biomeColors.set({...this.biomeColors.get(), [biome]: color})
    localStorage.setItem(LOCAL_STORAGE_BIOME_COLORS, JSON.stringify(this.biomeColors.get()))
  }

  getBiomeHex(biome: string): string {
    return '#' + this.getBiomeColor(biome).map(e => e.toString(16).padStart(2, '0')).join('')
  }

  private colorFromBiome(biome: string): number[] {
    const h = Math.abs(hashString(biome))
    return [h % 256, (h >> 8) % 256, (h >> 16) % 256]
  }
}

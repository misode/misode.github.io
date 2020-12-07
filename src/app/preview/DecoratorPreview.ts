import { DataModel, Path, ModelPath } from "@mcschema/core"
import seedrandom from "seedrandom"
import { App } from "../App"
import { clamp, hashString, hexId, stringToColor } from "../Utils"
import { PerlinNoise } from "./noise/PerlinNoise"
import { Preview } from './Preview'
import { Octicon } from '../components/Octicon'
import { View } from "../views/View"

type BlockPos = [number, number, number]
type Placement = { pos: BlockPos, feature: number }

const terrain = [50, 50, 51, 51, 52, 52, 53, 54, 56, 57, 57, 58, 58, 59, 60, 60, 60, 59, 59, 59, 60, 61, 61, 62, 63, 63, 64, 64, 64, 65, 65, 66, 66, 65, 65, 66, 66, 67, 67, 67, 68, 69, 71, 73, 74, 76, 79, 80, 81, 81, 82, 83, 83, 82, 82, 81, 81, 80, 80, 80, 81, 81, 82, 82] 
const seaLevel = 63
const featureColors = [
  [255, 77, 54],  // red
  [59, 118, 255], // blue
  [91, 207, 25],  // green
  [217, 32, 245], // magenta
  [255, 209, 41], // yellow
  [52, 204, 209], // cyan
]

export class DecoratorPreview extends Preview {
  private seed: string
  private perspective: string
  private size: [number, number, number]
  private random: seedrandom.prng
  private biomeInfoNoise: PerlinNoise
  private usedFeatures: string[]

  constructor() {
    super()
    this.seed = hexId()
    this.perspective = 'top'
    this.size = [64, 128, 48]
    this.random = seedrandom(this.seed)
    this.biomeInfoNoise = new PerlinNoise(hexId(), 0, [1])
    this.usedFeatures = []
  }

  getName() {
    return 'decorator'
  }

  active(path: ModelPath) {
    return App.model.get()?.id === 'worldgen/feature'
      && path.equals(new Path(['config', 'decorator']))
      && path.pop().pop().push('type').get() === 'minecraft:decorated'
  }

  menu(view: View, redraw: () => void) {
    return `
      <div class="btn" data-id="${view.onClick(() => {
        this.perspective = this.perspective === 'top' ? 'side' : 'top'
        redraw()
      })}">
        ${Octicon.package}
      </div>`
    }

  getSize(): [number, number] {
    return this.perspective === 'top' ? [this.size[0], this.size[2]] : [this.size[0], this.size[1]]
  }

  draw(model: DataModel, img: ImageData) {
    const featureData = JSON.parse(JSON.stringify(model.data))
    this.random = seedrandom(this.seed)
    this.usedFeatures = []

    let placements: Placement[] = []
    for (let x = 0; x < this.size[0]/16; x += 1) {
      for (let z = 0; z < (this.perspective === 'top' ? this.size[2]/16 : 1); z += 1) {
        const chunkPlacements = this.getPlacements([x * 16, 0, z * 16], featureData)
        const filtered = chunkPlacements.filter(p => {
          return p.pos.every((n, i) => n >= 0 && n < this.size[i])
        })
        placements = [...placements, ...filtered]
      }
    }

    const data = img.data
    img.data.fill(255)

    if (this.perspective === 'side') {
      for (let x = 0; x < this.size[0]; x += 1) {
        for (let y = 0; y < terrain[x % terrain.length]; y += 1) {
          const i = ((this.size[1] - y - 1) * (img.width * 4)) + (x * 4)
          for (let j = 0; j < 3; j += 1) {
            data[i + j] = 30
          }
        }
        for (let y = terrain[x % terrain.length]; y < seaLevel; y += 1) {
          const i = ((this.size[1] - y - 1) * (img.width * 4)) + (x * 4)
          data[i + 0] = 108
          data[i + 1] = 205
          data[i + 2] = 230
        }
      }
    }

    for (let {pos, feature} of placements) {
      const i = this.perspective === 'top'
        ? (pos[2] * (img.width * 4)) + (pos[0] * 4)
        : ((this.size[1] - pos[1] - 1) * (img.width * 4)) + (pos[0] * 4)
      const color = feature < featureColors.length ? featureColors[feature] : stringToColor(this.usedFeatures[feature])
      data.set(color.map(c => clamp(50, 205, c)), i)
    }

    for (let x = 0; x < this.size[0]; x += 1) {
      for (let y = 0; y < (this.perspective === 'top' ? this.size[2]: this.size[1]); y += 1) {
        if ((Math.floor(x/16) + (this.perspective === 'top' ? Math.floor(y/16) : 0)) % 2 === 0) continue
        const i = (y * (img.width * 4)) + (x * 4)
        for (let j = 0; j < 3; j += 1) {
          data[i + j] = 0.85 * data[i + j] 
        }
      }
    }
  }

  private useFeature(s: string) {
    const i = this.usedFeatures.indexOf(s)
    if (i != -1) return i
    this.usedFeatures.push(s)
    return this.usedFeatures.length - 1
  }
  
  private getPlacements (pos: BlockPos, feature: any): Placement[] {
    if (typeof feature === 'string') {
      return [{ pos, feature: this.useFeature(feature) }]
    }
    const type = feature?.type?.replace(/^minecraft:/, '')
    const featureFn = this.Features[type]
    if (!featureFn) {
      return [{ pos, feature: this.useFeature(JSON.stringify(feature)) }]
    }
    return featureFn(feature.config, pos)
  }

  private getPositions (pos: BlockPos, decorator: any): BlockPos[] {
    const type = decorator?.type?.replace(/^minecraft:/, '')
    const decoratorFn = this.Decorators[type]
    if (!decoratorFn) {
      return [pos]
    }
    return decoratorFn(decorator?.config, pos)
  }

  private decorateY(pos: BlockPos, y: number): BlockPos[] {
    return [[ pos[0], y, pos[2] ]]
  }

  private sampleUniformInt(value: any): number {
    if (typeof value === 'number') {
      return value
    } else {
      return (value.base ?? 1) + this.nextInt(1 + (value.spread ?? 0))
    }
  }

  private nextInt(max: number): number {
    return Math.floor(this.random() * max)
  }

  private Features: {
    [key: string]: (config: any, pos: BlockPos) => Placement[]
  } = {
    decorated: (config, pos) => {
      const positions = this.getPositions(pos, config?.decorator)
      return positions.flatMap(p => this.getPlacements(p, config?.feature))
    },
    random_boolean_selector: (config, pos) => {
      const feature = this.random() < 0.5 ? config?.feature_true : config?.feature_false
      return this.getPlacements(pos, feature)
    },
    random_selector: (config, pos) => {
      for (const f of config?.features ?? []) {
        if (this.random() < (f?.chance ?? 0)) {
          return this.getPlacements(pos, f.feature)
        }
      }
      return this.getPlacements(pos, config?.default)
    },
    simple_random_selector: (config, pos) => {
      const feature = config?.features?.[this.nextInt(config?.features?.length ?? 0)]
      return this.getPlacements(pos, feature)
    }
  }

  private Decorators: {
    [key: string]: (config: any, pos: BlockPos) => BlockPos[]
  } = {
    count: (config, pos) => {
      return new Array(this.sampleUniformInt(config?.count ?? 1)).fill(pos)
    },
    count_extra: (config, pos) => {
      let count = config?.count ?? 1
      if (this.random() < config.extra_chance ?? 0){
        count += config.extra_count ?? 0
      }
      return new Array(count).fill(pos)
    },
    count_noise: (config, pos) => {
      const noise = this.biomeInfoNoise.getValue(pos[0] / 200, 0, pos[2] / 200)
      const count = noise < config.noise_level ? config.below_noise : config.above_noise
      return new Array(count).fill(pos)
    },
    count_noise_biased: (config, pos) => {
      const factor = Math.max(1, config.noise_factor)
      const noise = this.biomeInfoNoise.getValue(pos[0] / factor, 0, pos[2] / factor)
      const count = Math.max(0, Math.ceil((noise + config.noise_offset) * config.noise_to_count_ratio))
      return new Array(count).fill(pos)
    },
    decorated: (config, pos) => {
      return this.getPositions(pos, config?.outer).flatMap(p => {
        return this.getPositions(p, config?.inner)
      })
    },
    heightmap: (config, pos) => {
      const y = Math.max(seaLevel, terrain[clamp(0, 63, pos[0])])
      return this.decorateY(pos, y)
    },
    heightmap_spread_double: (config, pos) => {
      const y = Math.max(seaLevel, terrain[clamp(0, 63, pos[0])])
      return this.decorateY(pos, this.nextInt(y * 2))
    },
    heightmap_world_surface: (config, pos) => {
      const y = Math.max(seaLevel, terrain[clamp(0, 63, pos[0])])
      return this.decorateY(pos, y)
    },
    range: (config, pos) => {
      const y = this.nextInt((config?.maximum ?? 1) - (config?.top_offset ?? 0)) + (config?.bottom_offset ?? 0)
      return this.decorateY(pos, y)
    },
    range_biased: (config, pos) => {
      const y = this.nextInt(this.nextInt((config?.maximum ?? 1) - (config?.top_offset ?? 0)) + (config?.bottom_offset ?? 0))
      return this.decorateY(pos, y)
    },
    range_very_biased: (config, pos) => {
      const y = this.nextInt(this.nextInt(this.nextInt((config?.maximum ?? 1) - (config?.top_offset ?? 0)) + (config?.bottom_offset ?? 0)) + (config?.bottom_offset ?? 0))
      return this.decorateY(pos, y)
    },
    spread_32_above: (config, pos) => {
      const y = this.nextInt(pos[1] + 32)
      return this.decorateY(pos, y)
    },
    top_solid_heightmap: (config, pos) => {
      const y = terrain[clamp(0, 63, pos[0])]
      return this.decorateY(pos, y)
    },
    magma: (config, pos) => {
      const y = this.nextInt(pos[1] + 32)
      return this.decorateY(pos, y)
    },
    square: (config, pos) => {
      return [[
        pos[0] + this.nextInt(16),
        pos[1],
        pos[2] + this.nextInt(16)
      ]]
    }
  }
}

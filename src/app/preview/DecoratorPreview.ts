import { DataModel, Path, ModelPath } from "@mcschema/core"
import seedrandom from "seedrandom"
import { App } from "../App"
import { clamp, hexId, stringToColor } from "../Utils"
import { PerlinNoise } from "./noise/PerlinNoise"
import { Preview } from './Preview'
import { Octicon } from '../components/Octicon'
import { View } from "../views/View"

type BlockPos = [number, number, number]
type Placement = { pos: BlockPos, feature: string } 

export class DecoratorPreview extends Preview {
  private seed: string
  private perspective: string

  constructor() {
    super()
    this.seed = hexId()
    this.perspective = 'top'
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
    return this.perspective === 'top' ? [4 * 16, 3 * 16] : [4 * 16, 128]
  }

  draw(model: DataModel, img: ImageData) {
    const featureData = JSON.parse(JSON.stringify(model.data))
    const random = seedrandom(this.seed)

    let placements: Placement[] = []
    for (let x = 0; x < 4; x += 1) {
      for (let z = 0; z < (this.perspective === 'top' ? 3 : 1); z += 1) {
        const p = getPlacements(random, [x * 16, 0, z * 16], featureData)
        placements = [...placements, ...p]
      }
    }

    const data = img.data
    img.data.fill(255)

    for (let {pos, feature} of placements) {
      const i = this.perspective === 'top'
        ? (pos[2] * (img.width * 4)) + (pos[0] * 4)
        : ((127 - pos[1]) * (img.width * 4)) + (pos[0] * 4)
      const color = stringToColor(feature)
      data.set(color.map(c => clamp(30, 205, c)), i)
    }

    for (let x = 0; x < 4 * 16; x += 1) {
      for (let y = 0; y < (this.perspective === 'top' ? 3 * 16: 128); y += 1) {
        if ((Math.floor(x/16) + (this.perspective === 'top' ? Math.floor(y/16) : 0)) % 2 === 0) continue
        const i = (y * (img.width * 4)) + (x * 4)
        for (let j = 0; j < 4; j += 1) {
          data[i + j] = data[i + j] - 30 
        }
      }
    }
  }
}

const biomeInfoNoise = new PerlinNoise(hexId(), 0, [1])

function getPlacements (random: seedrandom.prng, pos: BlockPos, feature: any): Placement[] {
  if (typeof feature === 'string') {
    return [{ pos, feature }]
  }
  const type = feature?.type?.replace(/^minecraft:/, '')
  const featureFn = Features[type]
  if (!featureFn) {
    return [{ pos, feature: JSON.stringify(feature) }]
  }
  return featureFn(feature.config, random, pos)
}

function getPositions (random: seedrandom.prng, pos: BlockPos, decorator: any): BlockPos[] {
  const type = decorator?.type?.replace(/^minecraft:/, '')
  const decoratorFn = Decorators[type]
  if (!decoratorFn) {
    return [pos]
  }
  return decoratorFn(decorator?.config, random, pos)
}

const Features: {
  [key: string]: (config: any, random: seedrandom.prng, pos: BlockPos) => Placement[]
} = {
  decorated: (config, random, pos) => {
    const positions = getPositions(random, pos, config?.decorator)
    return positions.flatMap(p => getPlacements(random, p, config?.feature))
  },
  random_boolean_selector: (config, random, pos) => {
    const feature = random() < 0.5 ? config?.feature_true : config?.feature_false
    return getPlacements(random, pos, feature)
  },
  random_selector: (config, random, pos) => {
    for (const f of config?.features ?? []) {
      if (random() < (f?.chance ?? 0)) {
        return getPlacements(random, pos, f.feature)
      }
    }
    return getPlacements(random, pos, config?.default)
  },
  simple_random_selector: (config, random, pos) => {
    const feature = config?.features?.[nextInt(random, config?.features?.length ?? 0)]
    return getPlacements(random, pos, feature)
  }
}

const Decorators: {
  [key: string]: (config: any, random: seedrandom.prng, pos: BlockPos) => BlockPos[]
} = {
  count: (config, random, pos) => {
    return new Array(sampleUniformInt(random, config?.count ?? 1)).fill(pos)
  },
  count_extra: (config, random, pos) => {
    let count = config?.count ?? 1
    if (random() < config.extra_chance ?? 0){
      count += config.extra_count ?? 0
    }
    return new Array(count).fill(pos)
  },
  count_noise: (config, random, pos) => {
    const noise = biomeInfoNoise.getValue(pos[0] / 200, 0, pos[2] / 200)
    const count = noise < config.noise_level ? config.below_noise : config.above_noise
    return new Array(count).fill(pos)
  },
  count_noise_biased: (config, random, pos) => {
    const factor = Math.max(1, config.noise_factor)
    const noise = biomeInfoNoise.getValue(pos[0] / factor, 0, pos[2] / factor)
    const count = Math.max(0, Math.ceil((noise + config.noise_offset) * config.noise_to_count_ratio))
    return new Array(count).fill(pos)
  },
  decorated: (config, random, pos) => {
    return getPositions(random, pos, config?.outer).flatMap(p => {
      return getPositions(random, p, config?.inner)
    })
  },
  range: (config, random, pos) => {
    const y = nextInt(random, (config?.maximum ?? 1) - (config?.top_offset ?? 0)) + (config?.bottom_offset ?? 0)
    return decorateY(pos, y)
  },
  range_biased: (config, random, pos) => {
    const y = nextInt(random, nextInt(random, (config?.maximum ?? 1) - (config?.top_offset ?? 0)) + (config?.bottom_offset ?? 0))
    return decorateY(pos, y)
  },
  range_very_biased: (config, random, pos) => {
    const y = nextInt(random, nextInt(random, nextInt(random, (config?.maximum ?? 1) - (config?.top_offset ?? 0)) + (config?.bottom_offset ?? 0)) + (config?.bottom_offset ?? 0))
    return decorateY(pos, y)
  },
  spread_32_above: (config, random, pos) => {
    const y = nextInt(random, pos[1] + 32)
    return decorateY(pos, y)
  },
  magma: (config, random, pos) => {
    const y = nextInt(random, pos[1] + 32)
    return decorateY(pos, y)
  },
  square: (config, random, pos) => {
    return [[
      pos[0] + nextInt(random, 16),
      pos[1],
      pos[2] + nextInt(random, 16)
    ]]
  }
}

function decorateY(pos: BlockPos, y: number): BlockPos[] {
  return [[ pos[0], y, pos[2] ]]
}

function sampleUniformInt(random: seedrandom.prng, value: any): number {
  if (typeof value === 'number') {
    return value
  } else {
    return (value.base ?? 1) + nextInt(random, 1 + (value.spread ?? 0))
  }
}

function nextInt(random: seedrandom.prng, max: number): number {
  return Math.floor(random() * max)
}

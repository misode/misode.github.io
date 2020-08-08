import { DataModel, Path } from "@mcschema/core"
import { BiomeNoiseVisualizer } from "./BiomeNoiseVisualizer"
import { NoiseSettingsVisualizer } from "./NoiseSettingsVisualizer"

export abstract class Visualizer {
  state: any

  dirty(model: DataModel): boolean {
    return JSON.stringify(this.state) !== JSON.stringify(this.getState(model))
  }

  active(model: DataModel): boolean {
    return true
  }

  abstract onPath(path: Path): boolean
  abstract getState(model: DataModel): any
  abstract draw(model: DataModel, img: ImageData): void

  onDrag(from: number[], to: number[]): void {}
}

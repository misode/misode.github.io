import { DataModel, ModelPath } from "@mcschema/core"

export abstract class Visualizer {
  state: any

  dirty(path: ModelPath): boolean {
    return JSON.stringify(this.state) !== JSON.stringify(path.get())
  }

  abstract getName(): string
  abstract active(path: ModelPath): boolean
  abstract draw(model: DataModel, img: ImageData): void

  onDrag(from: number[], to: number[]): void {}
}

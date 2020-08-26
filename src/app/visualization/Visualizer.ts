import { DataModel, ModelPath } from "@mcschema/core"
import { VisualizerView } from "./VisualizerView"

export abstract class Visualizer {
  state: any

  dirty(path: ModelPath): boolean {
    return JSON.stringify(this.state) !== JSON.stringify(path.get())
  }

  abstract getName(): string
  abstract active(path: ModelPath): boolean
  abstract draw(model: DataModel, img: ImageData): void

  onDrag(fromX: number, fromY: number, toX: number, toY: number): void {}

  addControls(el: HTMLElement, view: VisualizerView): void {}
}

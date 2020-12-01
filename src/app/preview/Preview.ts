import { DataModel, ModelPath } from "@mcschema/core"
import { View } from "../views/View"

export abstract class Preview {
  state: any
  path?: ModelPath

  dirty(path: ModelPath): boolean {
    return JSON.stringify(this.state) !== JSON.stringify(path.get())
  }

  menu(view: View, redraw: () => void): string {
    return ''
  }

  abstract getSize(): [number, number]
  abstract getName(): string
  abstract active(path: ModelPath): boolean
  abstract draw(model: DataModel, img: ImageData): void

  onDrag(dx: number, dy: number): void {}
}

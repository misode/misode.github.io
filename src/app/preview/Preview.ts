import { DataModel, ModelPath } from "@mcschema/core"

export abstract class Preview {
  state: any
  path?: ModelPath

  dirty(path: ModelPath): boolean {
    return JSON.stringify(this.state) !== JSON.stringify(path.get())
  }

  abstract getName(): string
  abstract active(path: ModelPath): boolean
  abstract draw(model: DataModel, img: ImageData): void

  onDrag(fromX: number, fromY: number, toX: number, toY: number): void {}
}

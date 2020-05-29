import { DataModel } from "./DataModel"

export type PathElement = (string | number)

export class Path implements Iterable<PathElement> {
  private arr: PathElement[]
  model?: DataModel

  constructor(arr?: PathElement[], model?: DataModel) {
    this.arr = arr ?? []
    this.model = model
  }

  last(): PathElement {
    return this.arr[this.arr.length - 1]
  }

  pop(): Path {
    return new Path(this.arr.slice(0, -1), this.model)
  }

  push(element: PathElement): Path {
    return new Path([...this.arr, element], this.model)
  }

  copy(): Path {
    return new Path([...this.arr], this.model)
  }

  getArray(): PathElement[] {
    return this.arr
  }

  withModel(model: DataModel): Path {
    return new Path([...this.arr], model)
  }

  get(): any {
    return this.model?.get(this)
  }

  toString(): string {
    return `[${this.arr.map(e => e.toString()).join(', ')}]`
  }

  *[Symbol.iterator]() {
    for (const e of this.arr) {
      yield e
    }
  }
}

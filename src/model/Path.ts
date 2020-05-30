import { DataModel } from "./DataModel"

export type PathElement = (string | number)

/**
 * Immutable helper class to represent a path in data
 * @implements {Iterable<PathElement>}
 */
export class Path implements Iterable<PathElement> {
  private arr: PathElement[]
  model?: DataModel

  /**
   * @param arr Initial array of path elements. Empty if not given
   * @param model Model attached to this path
   */
  constructor(arr?: PathElement[], model?: DataModel) {
    this.arr = arr ?? []
    this.model = model
  }

  /**
   * The last element of this path
   */
  last(): PathElement {
    return this.arr[this.arr.length - 1]
  }

  /**
   * A new path with the last element removed
   */
  pop(): Path {
    return new Path(this.arr.slice(0, -1), this.model)
  }

  /**
   * A new path with an element added at the end
   * @param element element to push at the end of the array
   */
  push(element: PathElement): Path {
    return new Path([...this.arr, element], this.model)
  }

  copy(): Path {
    return new Path([...this.arr], this.model)
  }

  getArray(): PathElement[] {
    return this.arr
  }

  /**
   * Attaches a model to this path and all paths created from this
   * @param model 
   */
  withModel(model: DataModel): Path {
    return new Path([...this.arr], model)
  }

  /**
   * Gets the data from the model if it was attached
   * @returns undefined, if no model was attached
   */
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

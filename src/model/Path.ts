
type PathElement = (string | number)

export class Path implements Iterable<PathElement> {
  private arr: PathElement[]

  constructor(arr?: PathElement[]) {
    this.arr = arr || []
  }

  last(): PathElement {
    return this.arr[this.arr.length - 1]
  }

  pop(): Path {
    return new Path(this.arr.slice(0, -1))
  }

  push(element: PathElement): Path {
    return new Path([...this.arr, element])
  }

  copy(): Path {
    return new Path([...this.arr])
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

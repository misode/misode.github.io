import { Path } from "./Path"
import { INode } from "../nodes/AbstractNode"

export interface ModelListener {
  invalidated(model: DataModel): void
}

export class DataModel {
  data: any
  schema: INode<any>
  listeners: ModelListener[]

  constructor(schema: INode<any>) {
    this.schema = schema
    this.data = schema.default()
    this.listeners = []
  }

  addListener(listener: ModelListener) {
    this.listeners.push(listener)
  }

  invalidate() {
    this.listeners.forEach(listener => listener.invalidated(this))
  }

  reset(value: any) {
    this.data = value
    this.invalidate()
  }

  get(path: Path) {
    let node = this.data;
    for (let index of path) {
      if (node === undefined) return node
      node = node[index]
    }
    return node
  }

  set(path: Path, value: any) {
    let node = this.data;
    for (let index of path.pop()) {
      if (node[index] === undefined) {
        node[index] = {}
      }
      node = node[index]
    }

    console.log('Set', path.toString(), JSON.stringify(value))

    if (value === undefined || (typeof value === 'number' && isNaN(value))) {
      if (typeof path.last() === 'number') {
        node.splice(path.last(), 1)
      } else {
        delete node[path.last()]
      }
    } else {
      node[path.last()] = value
    }

    this.invalidate()
  }
}

import { Path } from "./Path"
import { INode } from "../nodes/AbstractNode"

export interface ModelListener {
  invalidated(model: DataModel): void
}

/**
 * Holding the data linked to a given schema
 */
export class DataModel {
  data: any
  schema: INode<any>
  /** A list of listeners that want to be notified when the model is invalidated */
  listeners: ModelListener[]

  /**
   * @param schema node to use as schema for this model
   */
  constructor(schema: INode<any>) {
    this.schema = schema
    this.data = schema.default()
    this.listeners = []
  }

  /**
   * @param listener the listener to notify when the model is invalidated
   */
  addListener(listener: ModelListener) {
    this.listeners.push(listener)
  }

  /**
   * Force notify all listeners that the model is invalidated
   */
  invalidate() {
    this.listeners.forEach(listener => listener.invalidated(this))
  }

  /**
   * Resets the full data and notifies listeners
   * @param value new model data
   */
  reset(value: any) {
    this.data = value
    this.invalidate()
  }

  /**
   * Gets the data at a specified path
   * @param path path at which to find the data
   * @returns undefined, if the the path does not exist in the data
   */
  get(path: Path) {
    let node = this.data;
    for (let index of path) {
      if (node === undefined) return node
      node = node[index]
    }
    return node
  }

  /**
   * Updates the date on a path. Node will be removed when value is undefined
   * @param path path to update
   * @param value new data at the specified path
   */
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

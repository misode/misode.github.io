import { DataModel } from "../model/DataModel"
import { Path } from "../model/Path"
import { TreeView } from "../view/TreeView"

export interface INode<T> {
  setParent: (parent: INode<any>) => void
  default: () => T
  transform: (value: T) => any
  render: (path: Path, value: T, view: TreeView, options?: RenderOptions) => string
  renderRaw: (path: Path, value: T, view: TreeView, options?: RenderOptions) => string
}

export interface StateNode<T> extends INode<T> {
  getState: (el: Element) => T
}

export type RenderOptions = {
  hideLabel?: boolean
  syncModel?: boolean
}

export type NodeChildren = {
  [name: string]: INode<any>
}

export interface NodeMods<T> {
  default?: () => T
  transform?: (value: T) => any
}

export abstract class AbstractNode<T> implements INode<T> {
  parent?: INode<any>
  defaultMod: () => T
  transformMod: (v: T) => T

  constructor(def: () => T, mods?: NodeMods<T>) {
    this.defaultMod = mods?.default ?? def
    this.transformMod = mods?.transform ?? ((v: T) => v)
  }

  setParent(parent: INode<any>) {
    this.parent = parent
  }

  mounted(el: Element, path: Path, view: TreeView) {
    el.addEventListener('change', evt => {
      this.updateModel(el, path, view.model)
      evt.stopPropagation()
    })
  }

  updateModel(el: Element, path: Path, model: DataModel) {}

  default(): T {
    return this.defaultMod()
  }

  transform(value: T) {
    return this.transformMod(value)
  }

  render(path: Path, value: T, view: TreeView, options?: RenderOptions): string {
    const id = view.register(el => {
      this.mounted(el, path, view)
    })
    return `<div data-id="${id}">${this.renderRaw(path, value, view, options)}</div>`
  }

  abstract renderRaw(path: Path, value: T, view: TreeView, options?: RenderOptions): string
}

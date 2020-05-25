import { DataModel } from "../model/DataModel"
import { Path } from "../model/Path"
import { TreeView } from "../view/TreeView"

export interface INode<T> {
  setParent: (parent: INode<any>) => void
  transform: (value: T) => any
  render: (path: Path, value: T, view: TreeView) => string
}

export type NodeChildren = {
  [name: string]: INode<any>
}

export type NodeMods<T> = {
  default?: () => T
  transform?: (value: T) => any
}

export abstract class AbstractNode<T> implements INode<T> {
  parent?: INode<any>
  default?: T
  transformMod = (v: T) => v

  constructor(mods?: NodeMods<T>) {
    if (mods?.default) this.default = mods.default()
    if (mods?.transform) this.transformMod = mods.transform
  }

  setParent(parent: INode<any>) {
    this.parent = parent
  }

  wrap(path: Path, view: TreeView, renderResult: string): string {
    const id = view.register(el => {
      console.log(`Callback ${id} -> ${path.last()}`)
      this.mounted(el, path, view)
    })
    return `<div data-id="${id}">${renderResult}</div>`
  }

  mounted(el: Element, path: Path, view: TreeView) {
    el.addEventListener('change', evt => this.updateModel(el, path, view.model))
  }

  updateModel(el: Element, path: Path, model: DataModel) {}

  transform(value: T) {
    return this.transformMod(value)
  }

  abstract render(path: Path, value: T, view: TreeView): string  
}

import { DataModel } from "../model/DataModel"
import { Path } from "../model/Path"
import { TreeView } from "../view/TreeView"

export interface INode<T> {
  default: IDefault<T>
  transform: (path: Path, value: T) => any
  enabled: (path: Path, model: DataModel) => boolean
  render: (path: Path, value: T, view: TreeView, options?: RenderOptions) => string
  renderRaw: (path: Path, value: T, view: TreeView, options?: RenderOptions) => string
}

export interface StateNode<T> extends INode<T> {
  getState: (el: Element) => T
}

export type RenderOptions = {
  hideLabel?: boolean
  syncModel?: boolean
  collapse?: boolean
}

export type NodeChildren = {
  [name: string]: INode<any>
}

export type IDefault<T> = (value?: T) => T | undefined
export type ITransform<T> = (value: T) => any
export type IEnable = (path: Path) => boolean
export type IForce = () => boolean

export interface NodeMods<T> {
  default?: IDefault<T>
  transform?: ITransform<T>
  enable?: IEnable
  force?: IForce
}

export abstract class AbstractNode<T> implements INode<T> {
  defaultMod: IDefault<T>
  transformMod: ITransform<T>
  enableMod: IEnable
  forceMod: IForce

  constructor(mods?: NodeMods<T>) {
    this.defaultMod = mods?.default ?? ((v) => v)
    this.transformMod = mods?.transform ?? ((v) => v)
    this.enableMod = mods?.enable ?? (() => true)
    this.forceMod = mods?.force ?? (() => false)
  }

  mounted(el: Element, path: Path, view: TreeView) {
    el.addEventListener('change', evt => {
      this.updateModel(el, path, view.model)
      evt.stopPropagation()
    })
  }

  updateModel(el: Element, path: Path, model: DataModel) {}

  default(value?: T) {
    return this.defaultMod(value)
  }

  transform(path: Path, value: T) {
    if (!this.enabled(path)) return undefined
    if (value === undefined && this.force()) value = this.default(value)!
    return this.transformMod(value)
  }

  enabled(path: Path, model?: DataModel) {
    if (model) path = path.withModel(model)
    return this.enableMod(path.pop())
  }

  force(): boolean {
    return this.forceMod()
  }

  render(path: Path, value: T, view: TreeView, options?: RenderOptions): string {
    if (!this.enabled(path, view.model)) return ''
    
    const id = view.register(el => {
      this.mounted(el, path, view)
    })
    return `<div data-id="${id}" class="node ${this.getClassName()}">
      ${this.renderRaw(path, value, view, options)}
    </div>`
  }

  abstract renderRaw(path: Path, value: T, view: TreeView, options?: RenderOptions): string

  abstract getClassName(): string
}

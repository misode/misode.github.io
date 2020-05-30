import { DataModel } from "../model/DataModel"
import { Path } from "../model/Path"
import { TreeView } from "../view/TreeView"

/**
 * Schema node that supports some standard transformations
 */
export interface INode<T> {
  default: (value?: T) => T | undefined
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

/**
 * Basic implementation of the nodes
 * 
 * h
 */
export abstract class AbstractNode<T> implements INode<T> {
  defaultMod: IDefault<T>
  transformMod: ITransform<T>
  enableMod: IEnable
  forceMod: IForce

  /**
   * @param mods modifiers of the default transformations
   */
  constructor(mods?: NodeMods<T>) {
    this.defaultMod = mods?.default ?? ((v) => v)
    this.transformMod = mods?.transform ?? ((v) => v)
    this.enableMod = mods?.enable ?? (() => true)
    this.forceMod = mods?.force ?? (() => false)
  }

  /**
   * Runs when the element is mounted to the DOM
   * @param el mounted element
   * @param path data path that this node represents
   * @param view corresponding tree view where this was mounted
   */
  mounted(el: Element, path: Path, view: TreeView) {
    el.addEventListener('change', evt => {
      this.updateModel(el, path, view.model)
      evt.stopPropagation()
    })
  }

  /**
   * Runs when the DOM element 'change' event is called
   * @param el mounted element
   * @param path data path that this node represents
   * @param model corresponding model
   */
  updateModel(el: Element, path: Path, model: DataModel) {}

  /**
   * The default value of this node
   * @param value optional original value
   */
  default(value?: T) {
    return this.defaultMod(value)
  }

  /**
   * Transforms the data model to the final output format
   * @param 
   */
  transform(path: Path, value: T) {
    if (!this.enabled(path)) return undefined
    if (value === undefined && this.force()) value = this.default(value)!
    return this.transformMod(value)
  }

  /**
   * Determines whether the node should be enabled for this path
   * @param path
   * @param model
   */
  enabled(path: Path, model?: DataModel) {
    if (model) path = path.withModel(model)
    return this.enableMod(path.pop())
  }

  force(): boolean {
    return this.forceMod()
  }

  /**
   * Wraps and renders the node
   * @param path location 
   * @param value data used at 
   * @param view tree view context, containing the model
   * @param options optional render options
   * @returns string HTML wrapped representation of this node using the given data
   */
  render(path: Path, value: T, view: TreeView, options?: RenderOptions): string {
    if (!this.enabled(path, view.model)) return ''
    
    const id = view.register(el => {
      this.mounted(el, path, view)
    })
    return `<div data-id="${id}" class="node ${this.getClassName()}">
      ${this.renderRaw(path, value, view, options)}
    </div>`
  }

  /**
   * Renders the node and handles events to update the model
   * @param path 
   * @param value 
   * @param view tree view context, containing the model
   * @param options optional render options
   * @returns string HTML representation of this node using the given data
   */
  abstract renderRaw(path: Path, value: T, view: TreeView, options?: RenderOptions): string

  /**
   * The CSS classname used in the wrapped <div>
   */
  abstract getClassName(): string
}

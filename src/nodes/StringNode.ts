import { AbstractNode, NodeMods, RenderOptions, StateNode } from './AbstractNode'
import { Path } from '../model/Path'
import { DataModel } from '../model/DataModel'
import { TreeView } from '../view/TreeView'

export interface StringNodeMods extends NodeMods<string> {
  allowEmpty?: boolean
}

export class StringNode extends AbstractNode<string> implements StateNode<string> {
  allowEmpty: boolean

  constructor(mods?: StringNodeMods) {
    super(mods)
    this.allowEmpty = mods?.allowEmpty ?? false
  }

  getState(el: Element) {
    return el.querySelector('input')!.value
  }

  updateModel(el: Element, path: Path, model: DataModel) {
    const value = this.getState(el)
    model.set(path, this.allowEmpty || value !== '' ? value : undefined)
  }

  renderRaw(path: Path, value: string, view: TreeView, options?: RenderOptions) {
    return `${options?.hideLabel ? `` : `<label>${path.last()}</label>`}
      <input value="${value ?? ''}"></input>`
  }
} 

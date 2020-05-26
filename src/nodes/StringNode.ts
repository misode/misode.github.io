import { AbstractNode, NodeMods, RenderOptions, StateNode } from './AbstractNode'
import { Path } from '../model/Path'
import { DataModel } from '../model/DataModel'
import { TreeView } from '../view/TreeView'

export class StringNode extends AbstractNode<string> implements StateNode<string> {
  constructor(mods?: NodeMods<string>) {
    super(mods)
  }

  getState(el: Element) {
    return el.querySelector('input')!.value
  }

  updateModel(el: Element, path: Path, model: DataModel) {
    model.set(path, this.getState(el))
  }

  renderRaw(path: Path, value: string, view: TreeView, options?: RenderOptions) {
    return `${options?.hideLabel ? `` : `<label>${path.last()}</label>`}
      <input value="${value || ''}"></input>`
  }
} 

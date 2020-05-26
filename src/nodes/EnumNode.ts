import { AbstractNode, NodeMods, RenderOptions, StateNode } from './AbstractNode'
import { DataModel } from '../model/DataModel'
import { TreeView } from '../view/TreeView'
import { Path } from '../model/Path'

export class EnumNode extends AbstractNode<string> implements StateNode<string> {
  protected options: string[]

  constructor(options: string[], mods?: NodeMods<string> | string) {
    super(typeof mods === 'string' ? {
        default: () => mods,
        force: () => true
      } : mods)
    this.options = options
  }

  getState(el: Element) {
    return el.querySelector('select')!.value
  }

  updateModel(el: Element, path: Path, model: DataModel) {
    model.set(path, this.getState(el))
  }

  renderRaw(path: Path, value: string, view: TreeView, options?: RenderOptions) {
    const id = view.register(el => (el as HTMLInputElement).value = value)
    return `${options?.hideLabel ? `` : `<label>${path.last()}</label>`}
    <select data-id=${id}>
      ${this.options.map(o => `<option value="${o}">${o}</option>`).join('')}
    </select>`
  }
}

import { AbstractNode, NodeMods } from './AbstractNode'
import { DataModel } from '../model/DataModel'
import { TreeView } from '../view/TreeView'
import { Path } from '../model/Path'

export class EnumNode extends AbstractNode<string> {
  protected options: string[]

  constructor(options: string[], mods?: NodeMods<string>) {
    super(mods)
    this.options = options
  }

  updateModel(el: Element, path: Path, model: DataModel) {
    model.set(path, el.querySelector('select')?.value)
  }

  render(path: Path, value: string, view: TreeView) {
    const id = view.register(el => (el as HTMLInputElement).value = value)
    return this.wrap(path, view, `<span>${path.last()}</span>
    <select data-id=${id}>
      ${this.options.map(o => `<option value="${o}">${o}</option>`).join('')}
    </select>`)
  }
}

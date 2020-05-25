import { AbstractNode, NodeMods } from './AbstractNode'
import { Path } from '../model/Path'
import { DataModel } from '../model/DataModel'
import { TreeView } from '../view/TreeView'

export class StringNode extends AbstractNode<string> {
  constructor(mods?: NodeMods<string>) {
    super(mods)
  }

  updateModel(el: Element, path: Path, model: DataModel) {
    model.set(path, el.querySelector('input')?.value)
  }

  render(path: Path, value: string, view: TreeView) {
    return this.wrap(path, view,
      `<span>${path.last()}</span> <input value="${value || ''}"></input>`)
  }
}

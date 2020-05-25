import { AbstractNode, NodeMods } from './AbstractNode'
import { Path } from '../model/Path'
import { DataModel } from '../model/DataModel'

export class StringNode extends AbstractNode<string> {
  constructor(mods?: NodeMods<string>) {
    super(mods)
  }

  updateModel(el: Element, path: Path, model: DataModel) {
  }

  render(path: Path, value: string, model: DataModel) {
    return this.wrap(path, model, 
      `<span>${path.last()}</span> <input value="${value || ''}"></input>`)
  }
}

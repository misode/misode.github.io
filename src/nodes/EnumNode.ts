import { AbstractNode, NodeMods } from './AbstractNode'
import { DataModel } from '../model/DataModel'
import { Path } from '../model/Path'

export class EnumNode extends AbstractNode<string> {
  protected options: string[]

  constructor(options: string[], mods?: NodeMods<string>) {
    super(mods)
    this.options = options
  }

  updateModel(el: Element, path: Path, model: DataModel) {
  }

  render(path: Path, value: string, model: DataModel) {
    return this.wrap(path, model, `<span>${path.last()}</span>
    <select value="${value}">
      ${this.options.map(o => `<option>${o}</option>`)}
    </select>`)
  }
}

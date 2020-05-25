import { NodeChildren, NodeMods } from './AbstractNode'
import { ObjectNode, IObject } from './ObjectNode'
import { Path } from '../model/Path'
import { TreeView } from '../view/TreeView'

export class RootNode extends ObjectNode {
  id: string

  constructor(id: string, fields: NodeChildren, mods?: NodeMods<IObject>) {
    super(fields, mods)
    this.id = id
  }

  transform(value: IObject) {
    return JSON.stringify(super.transform(value))
  }

  render(path: Path, value: IObject, view: TreeView) {
    value = value || {}
    return `<div>
      ${Object.keys(this.fields).map(f => {
        return this.fields[f].render(path.push(f), value[f], view)
      }).join('')}
    </div>`
  }
}

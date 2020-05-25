import { NodeChildren, NodeMods } from './AbstractNode'
import { ObjectNode, IObject } from './ObjectNode'
import { Path } from '../model/Path'
import { DataModel } from '../model/DataModel'

export class RootNode extends ObjectNode {
  id: string

  constructor(id: string, fields: NodeChildren, mods?: NodeMods<IObject>) {
    super(fields, mods)
    this.id = id
  }

  transform(value: IObject) {
    return JSON.stringify(super.transform(value))
  }

  render(path: Path, value: IObject, model: DataModel) {
    value = value || {}
    return `<div>
      ${Object.keys(this.fields).map(f => {
        return this.fields[f].render(path.push(f), value[f], model)
      }).join('')}
    </div>`
  }
}

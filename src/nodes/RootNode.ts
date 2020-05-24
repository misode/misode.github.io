import { NodeChildren, NodeMods } from './AbstractNode'
import { ObjectNode, IObject } from './ObjectNode'

export class RootNode extends ObjectNode {
  private id: string

  constructor(id: string, fields: NodeChildren, mods?: NodeMods<any>) {
    super(fields, mods)
    this.id = id
  }

  transform(value: IObject) {
    return JSON.stringify(super.transform(value))
  }

  render(field: string, value: IObject) {
    value = value || {}
    return `<div>
      ${Object.keys(this.fields).map(f => {
        return this.fields[f].render(f, value[f])
      }).join('<br>')}
    </div>`
  }
}

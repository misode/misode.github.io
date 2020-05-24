import { AbstractNode, NodeChildren, NodeMods } from './AbstractNode'

export interface IObject {
  [name: string]: any
}

export class ObjectNode extends AbstractNode<IObject> {
  protected fields: NodeChildren

  constructor(fields: NodeChildren, mods?: NodeMods<IObject>) {
    super(mods)
    this.fields = fields
    Object.values(fields).forEach(child => {
      child.setParent(this)
    })
  }

  getFields() {
    return this.fields
  }

  transform(value: IObject) {
    if (value === undefined) return undefined
    value = value || {}
    let res: any = {}
    Object.keys(this.fields).forEach(f =>
      res[f] = this.fields[f].transform(value[f])
    )
    return res;
  }

  render(field: string, value: IObject) {
    if (value === undefined) return ``
    return `<span>${field}:</span><div style="padding-left:8px">
      ${Object.keys(this.fields).map(f => {
        return this.fields[f].render(f, value[f])
      }).join('<br>')}
    </div>`
  }
}

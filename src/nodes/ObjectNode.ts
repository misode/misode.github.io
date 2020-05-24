import { AbstractNode, NodeChildren, NodeMods } from './AbstractNode'

export class ObjectNode extends AbstractNode<any> {
  private fields: NodeChildren

  constructor(fields: NodeChildren, mods?: NodeMods<any>) {
    super(mods)
    this.fields = fields
    Object.values(fields).forEach(child => {
      child.setParent(this)
    })
  }

  render(field: string, value: any) {
    value = value || {}
    return `<span>${field}:</span><div>
      ${Object.keys(this.fields).map(f => {
        return '> ' + this.fields[f].render(f, value[f])
      }).join('<br>')}
    </div>`
  }
}

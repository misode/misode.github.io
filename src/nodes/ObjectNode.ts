import { AbstractNode, NodeChildren, NodeMods } from './AbstractNode'
import { TreeView } from '../view/TreeView'
import { Path } from '../model/Path'

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

  transform(value: IObject) {
    if (value === undefined) return undefined
    value = value || {}
    let res: any = {}
    Object.keys(this.fields).forEach(f =>
      res[f] = this.fields[f].transform(value[f])
    )
    return res;
  }

  render(path: Path, value: IObject, view: TreeView) {
    if (value === undefined) return ``
    return this.wrap(path, view, `<span>${path.last()}:</span><div style="padding-left:8px">
      ${Object.keys(this.fields).map(f => {
        return this.fields[f].render(path.push(f), value[f], view)
      }).join('')}
    </div>`)
  }
}

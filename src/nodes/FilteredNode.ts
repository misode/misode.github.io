import { NodeMods, INode, NodeChildren, AbstractNode, RenderOptions } from './AbstractNode'
import { IObject } from './ObjectNode'
import { Path } from '../model/Path'
import { TreeView } from '../view/TreeView'

export const Switch = Symbol('switch')

type NestedNodeChildren = {
  [name: string]: NodeChildren
}

export type FilteredChildren = {
  [name: string]: INode<any>
  [Switch]: NestedNodeChildren
}

export class FilteredNode extends AbstractNode<IObject> {
  filter: string
  fields: NodeChildren
  cases: NestedNodeChildren

  constructor(filter: string, fields: FilteredChildren, mods?: NodeMods<IObject>) {
    super(mods)
    this.filter = filter;
    const {[Switch]: _switch, ..._fields} = fields
    this.fields = _fields
    this.cases = _switch
  }

  transform(path: Path, value: IObject) {
    if (value === undefined) return undefined
    value = value ?? {}
    const activeCase = this.cases[value[this.filter]] ?? []
    const activeFields = {...this.fields, ...activeCase}
    let res: any = {}
    Object.keys(activeFields).forEach(f =>
      res[f] = activeFields[f].transform(path.push(f), value[f])
    )
    return res;
  }

  renderRaw(path: Path, value: IObject, view: TreeView, options?: RenderOptions) {
    if (value === undefined) return ``
    const activeCase = this.cases[value[this.filter]] ?? []
    const activeFields = {...this.fields, ...activeCase}
    return `${options?.hideLabel ? `` : `<label>${path.last()}:</label>
    <div style="padding-left:8px">`}
      ${Object.keys(activeFields).map(f => {
        return activeFields[f].render(path.push(f), value[f], view)
      }).join('')}
    ${options?.hideLabel ? `` : `</div>`}`
  }
}

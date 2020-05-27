import { NodeMods, INode, NodeChildren, AbstractNode, RenderOptions } from './AbstractNode'
import { Path } from '../model/Path'
import { TreeView } from '../view/TreeView'

export const Switch = Symbol('switch')
export const Case = Symbol('case')

export type NestedNodeChildren = {
  [name: string]: NodeChildren
}

export type IObject = {
  [name: string]: any
}

export type FilteredChildren = {
  [name: string]: INode<any>
  [Switch]?: string
  [Case]?: NestedNodeChildren
}

export class ObjectNode extends AbstractNode<IObject> {
  fields: NodeChildren
  cases: NestedNodeChildren
  filter?: string

  constructor(fields: FilteredChildren, mods?: NodeMods<IObject>) {
    super({
      default: () => ({}),
      ...mods})
    const {[Switch]: _switch, [Case]: _case, ..._fields} = fields
    this.fields = _fields
    this.cases = _case ?? {}
    this.filter = _switch
  }

  transform(path: Path, value: IObject) {
    if (value === undefined) return undefined
    const activeCase = this.filter ? this.cases[value[this.filter]] : {};
    const activeFields = {...this.fields, ...activeCase}
    let res: any = {}
    Object.keys(activeFields).forEach(f => {
      console.log(f)
      return res[f] = activeFields[f].transform(path.push(f), value[f])
    })
    return this.transformMod(res);
  }

  renderRaw(path: Path, value: IObject, view: TreeView, options?: RenderOptions) {
    value = value ?? {}
    const activeCase = this.filter ? this.cases[value[this.filter]] : {};
    const activeFields = {...this.fields, ...activeCase}
    return `${options?.hideLabel ? `` : `<label>${path.last()}:</label>
    <div style="padding-left:8px">`}
      ${Object.keys(activeFields).map(f => {
        return activeFields[f].render(path.push(f), value[f], view)
      }).join('')}
    ${options?.hideLabel ? `` : `</div>`}`
  }
}

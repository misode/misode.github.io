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

export interface ObjectNodeMods extends NodeMods<object> {
  collapse?: boolean
}

export class ObjectNode extends AbstractNode<IObject> {
  fields: NodeChildren
  cases: NestedNodeChildren
  filter?: string
  collapse?: boolean

  constructor(fields: FilteredChildren, mods?: ObjectNodeMods) {
    super({
      default: () => ({}),
      ...mods})
    this.collapse = mods?.collapse ?? false
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
      return res[f] = activeFields[f].transform(path.push(f), value[f])
    })
    return this.transformMod(res);
  }

  renderRaw(path: Path, value: IObject, view: TreeView, options?: RenderOptions) {
    const activeCase = this.filter ? this.cases[value[this.filter]] : {};
    const activeFields = {...this.fields, ...activeCase}
    if (options?.hideLabel) {
      value = value ?? {}
      return this.renderFields(path, value, view, activeFields)
    } else if (this.collapse || options?.collapse) {
      if (value === undefined) {
        const id = view.registerClick(() => view.model.set(path, this.default()))
        return `<label class="collapse closed" data-id="${id}">${path.last()}</label>`
      } else {
        const id = view.registerClick(() => view.model.set(path, undefined))
        return `<label class="collapse open" data-id="${id}">${path.last()}</label>
        <div class="object-fields">
        ${this.renderFields(path, value, view, activeFields)}
        </div>`
      }
    } else {
      value = value ?? {}
      return `<label>${path.last()}</label>
      <div class="object-fields">
      ${this.renderFields(path, value, view, activeFields)}
      </div>`
    }
  }

  renderFields(path: Path, value: IObject, view: TreeView, activeFields: NodeChildren) {
    return Object.keys(activeFields).map(f => {
      return activeFields[f].render(path.push(f), value[f], view)
    }).join('')
  }

  getClassName() {
    return 'object-node'
  }
}

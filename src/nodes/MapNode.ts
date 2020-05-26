import { AbstractNode, NodeMods, INode, StateNode } from './AbstractNode'
import { TreeView } from '../view/TreeView'
import { Path } from '../model/Path'
import { IObject } from './ObjectNode'

export type IMap = {
  [name: string]: IObject
}

export class MapNode extends AbstractNode<IMap> {
  protected keys: StateNode<string>
  protected values: INode<any>

  constructor(keys: StateNode<string>, values: INode<any>, mods?: NodeMods<IMap>) {
    super(mods, {
      default: () => ({})
    })
    this.keys = keys
    this.values = values
  }

  renderRaw(path: Path, value: IMap, view: TreeView) {
    value = value || []
    const button = view.registerClick(el => {
      const key = this.keys.getState(el.parentElement!)
      view.model.set(path.push(key), this.values.default())
    })
    return `<label>${path.last()}:</label>
    ${this.keys.renderRaw(path, '', view, {hideLabel: true, syncModel: false})}
    <button data-id="${button}">Add</button>
    <div style="padding-left:8px">
      ${Object.keys(value).map(key => {
        return this.renderEntry(path.push(key), value[key], view)
      }).join('')}
    </div>`
  }

  private renderEntry(path: Path, value: IObject, view: TreeView) {
    const button = view.registerClick(el => {
      view.model.set(path, undefined)
    })
    return `<div><button data-id="${button}">Remove</button>
      ${this.values.render(path, value, view)}
    </div>`
  }
}

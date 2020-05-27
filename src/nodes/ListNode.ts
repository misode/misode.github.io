import { AbstractNode, NodeMods, INode } from './AbstractNode'
import { DataModel } from '../model/DataModel'
import { TreeView } from '../view/TreeView'
import { Path } from '../model/Path'
import { IObject } from './ObjectNode'

export class ListNode extends AbstractNode<IObject[]> {
  protected children: INode<any>

  constructor(values: INode<any>, mods?: NodeMods<IObject[]>) {
    super({
      default: () => [],
      ...mods})
    this.children = values
  }

  transform(path: Path, value: IObject[]) {
    if (!(value instanceof Array)) return undefined
    const res = value.map((obj, index) => 
      this.children.transform(path.push(index), obj)
    )
    return this.transformMod(res)
  }

  updateModel(el: Element, path: Path, model: DataModel) {
    model.set(path, el.querySelector('select')?.value)
  }

  renderRaw(path: Path, value: IObject[], view: TreeView) {
    value = value || []
    const button = view.registerClick(el => {
      view.model.set(path, [...value, this.children.default()])
    })
    return `<label>${path.last()}:</label>
    <button data-id="${button}">Add</button>
    <div style="padding-left:8px">
      ${value.map((obj, index) => {
        return this.renderEntry(path.push(index), obj, view)
      }).join('')}
    </div>`
  }

  private renderEntry(path: Path, value: IObject, view: TreeView) {
    const button = view.registerClick(el => {
      view.model.set(path, undefined)
    })
    return `<div><button data-id="${button}">Remove</button>
      ${this.children.render(path, value, view, {hideLabel: true})}
    </div>`
  }
}

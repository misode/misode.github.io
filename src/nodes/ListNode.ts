import { AbstractNode, NodeMods, INode } from './AbstractNode'
import { DataModel } from '../model/DataModel'
import { TreeView } from '../view/TreeView'
import { Path } from '../model/Path'
import { IObject } from './ObjectNode'
import { locale } from '../Registries'

/**
 * List node where children can be added and removed from
 */
export class ListNode extends AbstractNode<IObject[]> {
  protected children: INode<any>

  /**
   * @param values node used for its children
   * @param mods optional node modifiers
   */
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
    return `<label>${locale(path)}:</label>
    <button data-id="${button}">${locale('add')}</button>
    <div class="list-fields">
      ${value.map((obj, index) => {
        return this.renderEntry(path.push(index), obj, view)
      }).join('')}
    </div>`
  }

  private renderEntry(path: Path, value: IObject, view: TreeView) {
    const button = view.registerClick(el => {
      view.model.set(path, undefined)
    })
    return `<div class="list-entry"><button data-id="${button}">${locale('remove')}</button>
      ${this.children.render(path, value, view, {hideLabel: true})}
    </div>`
  }

  getClassName() {
    return 'list-node'
  }
}

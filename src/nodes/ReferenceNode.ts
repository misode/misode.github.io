import { AbstractNode, NodeMods, RenderOptions, INode } from './AbstractNode'
import { TreeView } from '../view/TreeView'
import { Path } from '../model/Path'
import { SCHEMAS } from '../Registries'

export interface AnyNodeMods extends NodeMods<any> {
  [name: string]: any
}

/**
 * Reference node. Must be used when recursively adding nodes.
 */
export class ReferenceNode extends AbstractNode<any> {
  protected reference: () => INode<any>
  options: RenderOptions

  /**
   * @param id schema id that was registered
   * @param mods optional node modifiers
   */
  constructor(id: string, mods?: AnyNodeMods) {
    super(mods)
    this.options = {
      collapse: mods?.collapse
    }
    this.reference = () => SCHEMAS.get(id)
  }

  default(value?: any) {
    return this.reference().default(value)
  }

  transform(path: Path, value: any) {
    return this.reference()?.transform(path, value)
  }

  render(path: Path, value: any, view: TreeView, options?: RenderOptions) {
    return this.reference()?.render(path, value, view, {...this.options, ...options})
  }

  renderRaw(path: Path, value: any, view: TreeView, options?: RenderOptions) {
    return this.reference()?.renderRaw(path, value, view, {...this.options, ...options})
  }

  getClassName() {
    return ''
  }
}

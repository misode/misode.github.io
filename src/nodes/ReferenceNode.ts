import { AbstractNode, NodeMods, RenderOptions, INode } from './AbstractNode'
import { TreeView } from '../view/TreeView'
import { Path } from '../model/Path'
import { SCHEMAS } from '../Registries'

export interface AnyNodeMods extends NodeMods<any> {
  [name: string]: any
}

export class ReferenceNode extends AbstractNode<any> {
  protected reference: () => INode<any>
  options: RenderOptions

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

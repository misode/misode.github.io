import { AbstractNode, NodeMods, RenderOptions, INode } from './AbstractNode'
import { TreeView } from '../view/TreeView'
import { Path } from '../model/Path'
import { SCHEMAS } from '../schemas/Registries'

export class ReferenceNode extends AbstractNode<any> {
  protected reference: () => INode<any>

  constructor(id: string, mods?: NodeMods<any>) {
    super(mods)
    this.reference = () => SCHEMAS.get(id)
  }

  default(value?: any) {
    return this.reference().default(value)
  }

  transform(path: Path, value: any) {
    return this.reference()?.transform(path, value)
  }

  render(path: Path, value: any, view: TreeView, options?: RenderOptions) {
    return this.reference()?.render(path, value, view, options)
  }

  renderRaw(path: Path, value: any, view: TreeView, options?: RenderOptions) {
    return this.reference()?.renderRaw(path, value, view, options)
  }
}

import { AbstractNode, NodeChildren, NodeMods, RenderOptions, INode } from './AbstractNode'
import { TreeView } from '../view/TreeView'
import { Path } from '../model/Path'
import { SchemaRegistry } from '../schemas/SchemaRegistry'

export class ReferenceNode extends AbstractNode<any> {
  protected reference: string

  constructor(reference: string, mods?: NodeMods<any>) {
    super(mods)
    this.reference = reference
  }

  get(): INode<any> {
    const node = SchemaRegistry.get(this.reference)
    if (node === undefined) {
      console.error(`Invalid schema reference "${this.reference}"`)
    }
    return node 
  }

  default(value?: any) {
    return this.get().default(value)
  }

  transform(path: Path, value: any) {
    return this.get()?.transform(path, value)
  }

  render(path: Path, value: any, view: TreeView, options?: RenderOptions) {
    return this.get()?.render(path, value, view, options)
  }

  renderRaw(path: Path, value: any, view: TreeView, options?: RenderOptions) {
    return this.get()?.renderRaw(path, value, view, options)
  }
}

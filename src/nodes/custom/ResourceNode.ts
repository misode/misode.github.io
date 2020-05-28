import { NodeMods, RenderOptions } from '../AbstractNode'
import { EnumNode } from '../EnumNode'
import { Path } from '../../model/Path'
import { TreeView, getId } from '../../view/TreeView'

export interface ResourceNodeMods extends NodeMods<string> {
  additional?: boolean
}

export class ResourceNode extends EnumNode {
  additional: boolean

  constructor(options: string[], mods?: ResourceNodeMods) {
    super(options, {
      transform: (v) => {
        if (v === undefined || v.length === 0) return undefined
        return v.startsWith('minecraft:') ? v : 'minecraft:' + v
      }, ...mods})
    this.additional = mods?.additional ?? false
  }

  getState(el: Element) {
    if (this.additional) {
      return el.querySelector('input')!.value
    } else {
      return super.getState(el)
    }
  }

  renderRaw(path: Path, value: string, view: TreeView, options?: RenderOptions) {
    if (this.additional) {
      const id = `datalist-${getId()}`
      return `${options?.hideLabel ? `` : `<label>${path.last()}</label>`}
      <input list=${id} value="${value ?? ''}">
      <datalist id=${id}>${this.options.map(o => `<option value="${o}">`).join('')}</datalist>`
    } else {
      return super.renderRaw(path, value, view, options)
    }
  }
}

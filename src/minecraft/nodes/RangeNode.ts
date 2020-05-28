import { AbstractNode, NodeMods, RenderOptions, StateNode } from '../../nodes/AbstractNode'
import { Path } from '../../model/Path'
import { DataModel } from '../../model/DataModel'
import { TreeView } from '../../view/TreeView'

export type IRange = number
  | { min?: number, max?: number, type?: 'uniform' }
  | { n?: number, p?: number, type: 'binomial' }

export interface RangeNodeMods extends NodeMods<IRange> {
  integer?: boolean
}

export class RangeNode extends AbstractNode<IRange> implements StateNode<IRange> {
  integer: boolean

  constructor(mods?: RangeNodeMods) {
    super(mods)
    this.integer = mods?.integer ? mods.integer : false
  }

  parseNumber(str: string): number {
    return this.integer ? parseInt(str) : parseFloat(str)
  }

  getState(el: Element): IRange {
    const type = el.querySelector('select')!.value
    if (type === 'exact') {
      return this.parseNumber(el.querySelector('input')!.value)
    }
    if (type === 'range') {
      const min = this.parseNumber(el.querySelectorAll('input')[0].value)
      const max = this.parseNumber(el.querySelectorAll('input')[1].value)
      return {
        min: isNaN(min) ? undefined : min,
        max: isNaN(max) ? undefined : max
      }
    }
    const n = parseInt(el.querySelectorAll('input')[0].value)
    const p = parseFloat(el.querySelectorAll('input')[1].value)
    return {
      type: 'binomial',
      n: isNaN(n) ? undefined : n,
      p: isNaN(p) ? undefined : p
    }
  }

  updateModel(el: Element, path: Path, model: DataModel) {
    model.set(path, this.getState(el))
  }

  renderRaw(path: Path, value: IRange, view: TreeView, options?: RenderOptions) {
    let curType = ''
    let input = ''
    if (value === undefined || typeof value === 'number') {
      curType = 'exact'
      input = `<input value=${value === undefined ? '' : value}>`
    } else if (value.type === 'binomial') {
      curType = 'binomial'
      input = `<label>n</label>
        <input value=${value.n === undefined ? '' : value.n}>
        <label>p</label>
        <input value=${value.p === undefined ? '' : value.p}>`
    } else {
      curType = 'range'
      input = `<label>Min</label>
        <input value=${value.min === undefined ? '' : value.min}>
        <label>Max</label>
        <input value=${value.max === undefined ? '' : value.max}>`
    }
    const id = view.register(el => {
      (el as HTMLInputElement).value = curType
      el.addEventListener('change', evt => {
        const target = (el as HTMLInputElement).value
        const newValue = this.default(target === 'exact' ? undefined :
          target === 'binomial' ? {type: 'binomial'} : {})
        view.model.set(path, newValue)
        evt.stopPropagation()
      })
    })
    return `${options?.hideLabel ? `` : `<label>${path.last()}</label>`}
      <select data-id="${id}">
        <option value="exact">Exact</option>
        <option value="range">Range</option>
        <option value="binomial">Binomial</option>
      </select>
      ${input}`
  }

  getClassName() {
    return 'range-node'
  }

  static isExact(v?: IRange) {
    return v === undefined || typeof v === 'number'
  }

  static isRange(v?: IRange) {
    return v !== undefined && typeof v !== 'number' && v.type !== 'binomial'
  }

  static isBinomial(v?: IRange) {
    return v !== undefined && typeof v !== 'number' && v.type === 'binomial'
  }
}

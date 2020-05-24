import { AbstractNode, NodeMods } from './AbstractNode'

export class EnumNode extends AbstractNode<string> {
  protected options: string[]

  constructor(options: string[], mods?: NodeMods<string>) {
    super(mods)
    this.options = options
  }

  render (field: string, value: string) {
    return `<span>${field}</span>
    <select value="${value}">
      ${this.options.map(o => `<option>${o}</option>`)}
    </select>`
  }
}

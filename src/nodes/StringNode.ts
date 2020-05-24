import { AbstractNode, NodeMods } from './AbstractNode'

export class StringNode extends AbstractNode<string> {
  constructor(mods?: NodeMods<string>) {
    super(mods)
  }

  render(field: string, value: string) {
    return `<span>${field}</span> <span>${value || ''}</span>`
  }
}

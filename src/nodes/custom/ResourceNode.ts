import { NodeMods, RenderOptions } from '../AbstractNode'
import { StringNode } from '../StringNode'

export class ResourceNode extends StringNode {
  constructor(mods?: NodeMods<string>) {
    super({
      transform: (v) => {
        if (v === undefined) return undefined
        return v.startsWith('minecraft:') ? v : 'minecraft:' + v
      }, ...mods})
  }
} 

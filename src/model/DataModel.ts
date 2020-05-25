import { RootNode } from "../nodes/RootNode"
import { Path } from "./Path"

type Registry = {
  [id: string]: (el: Element) => void
}

const registryIdLength = 12
const dec2hex = (dec: number) => ('0' + dec.toString(16)).substr(-2)

export function getId() {
  var arr = new Uint8Array((registryIdLength || 40) / 2)
  window.crypto.getRandomValues(arr)
  return Array.from(arr, dec2hex).join('')
}

export class DataModel {
  private data: any
  private schema: RootNode
  private registry: Registry = {}

  constructor(schema: RootNode) {
    this.schema = schema
    this.data = schema.default
  }

  register(id: string, callback: (el: Element) => void) {
    this.registry[id] = callback
  }

  render(target: HTMLElement) {
    target.innerHTML = this.schema.render(new Path(), this.data, this)
    for (const id in this.registry) {
      const element = target.querySelector(`[data-id="${id}"]`)
      if (element !== null) this.registry[id](element)
    }
  }
}

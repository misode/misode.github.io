import { ModelPath } from '@mcschema/core'
import { hexId } from './utils_'

type Registry = {
  [id: string]: (el: Element) => void
}

type NodeInjector = (path: ModelPath, mounter: Mounter) => string

type TreeViewOptions = {
  nodeInjector?: NodeInjector
}

export interface Mounter {
  register(callback: (el: Element) => void): string
  registerEvent(type: string, callback: (el: Element) => void): string
  registerChange(callback: (el: Element) => void): string
  registerClick(callback: (el: Element) => void): string
  nodeInjector(path: ModelPath, mounter: Mounter): string
  mount(el: Element): void
}

export class Mounter implements Mounter {
  registry: Registry = {}
  nodeInjector: NodeInjector

  constructor(options?: TreeViewOptions) {
    this.nodeInjector = options?.nodeInjector ?? (() => '')
  }

  /**
   * Registers a callback and gives an ID
   * @param callback function that is called when the element is mounted
   * @returns the ID that should be applied to the data-id attribute
   */
  register(callback: (el: Element) => void): string {
    const id = hexId()
    this.registry[id] = callback
    return id
  }

  /**
   * Registers an event and gives an ID
   * @param type event type
   * @param callback function that is called when the event is fired
   * @returns the ID that should be applied to the data-id attribute
   */
  registerEvent(type: string, callback: (el: Element) => void): string {
    return this.register(el => {
      el.addEventListener(type, evt => {
        callback(el)
        evt.stopPropagation()
      })
    })
  }

  /**
   * Registers a change event and gives an ID
   * @param callback function that is called when the event is fired
   * @returns the ID that should be applied to the data-id attribute
   */
  registerChange(callback: (el: Element) => void): string {
    return this.registerEvent('change', callback)
  }

  /**
   * Registers a click event and gives an ID
   * @param callback function that is called when the event is fired
   * @returns the ID that should be applied to the data-id attribute
   */
  registerClick(callback: (el: Element) => void): string {
    return this.registerEvent('click', callback)
  }

  mount(el: Element): void {
    for (const id in this.registry) {
      const element = el.querySelector(`[data-id="${id}"]`)
      if (element !== null) this.registry[id](element)
    }
    this.registry = {}
  }
}

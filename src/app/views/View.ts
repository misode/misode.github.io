import { locale } from "../Locales"
import { hexId } from "../Utils"

export class View {
  private registry: { [id: string]: (el: Element) => void } = {}

  render(): string {
    return ''
  }

  register(callback: (el: Element) => void): string {
    const id = hexId()
    this.registry[id] = callback
    return id
  }

  on(type: string, callback: (el: Element) => void): string {
    return this.register(el => {
      el.addEventListener(type, evt => {
        callback(el)
        evt.stopPropagation()
      })
    })
  }

  onChange(callback: (el: Element) => void): string {
    return this.on('change', callback)
  }

  onClick(callback: (el: Element) => void): string {
    return this.on('click', callback)
  }

  mounted(el: Element, clear = true): void {
    for (const id in this.registry) {
      const element = el.querySelector(`[data-id="${id}"]`)
      if (element !== null) {
        this.registry[id](element)
        delete this.registry[id]
      }
    }
    if (clear) {
      this.registry = {}
    }
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = locale(el.attributes.getNamedItem('data-i18n')!.value)
    })
  }

  mount(el: Element, html: string, clear = true) {
    el.innerHTML = html
    this.mounted(el, clear)
  }
}

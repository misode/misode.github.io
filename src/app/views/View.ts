import { locale } from "../Locales"
import { hexId } from "../Utils"


export interface Mounter {
  register(callback: (el: Element) => void): string
  onChange(callback: (el: Element) => void): string
  onClick(callback: (el: Element) => void): string
  mounted(el: Element, clear?: boolean): void
}

export class View implements Mounter{
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
    el.querySelectorAll('[data-id]').forEach(el => {
      const id = el.getAttribute('data-id')!
      this.registry[id]?.(el)
    })
    if (clear) {
      this.registry = {}
    }
    el.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = locale(el.attributes.getNamedItem('data-i18n')!.value)
    })
  }

  mount(el: Element, html: string, clear = true) {
    el.innerHTML = html
    this.mounted(el, clear)
  }
}

export const toggleMenu = (el: Element) => {
  el.classList.add('active')
  const hideMenu = () => document.body.addEventListener('click', evt => {
    if ((evt.target as Element).matches('.btn.input') || (evt.target as Element).closest('.btn')?.classList.contains('input')) {
      hideMenu()
      return
    }
    el.classList.remove('active')
  }, { capture: true, once: true })
  hideMenu()
}

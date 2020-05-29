import { INode } from "./nodes/AbstractNode"
import { Path, PathElement } from "./model/Path"

export interface Registry<T> {
  register(id: string, value: T): void
  get(id: string): T
}

class SchemaRegistry implements Registry<INode<any>> {
  private registry: { [id: string]: INode<any> } = {}

  register(id: string, node: INode<any>) {
    this.registry[id] = node
  }

  get(id: string) {
    const node = this.registry[id]
    if (node === undefined) {
      console.error(`Tried to access schema "${id}, but that doesn't exit.`)
    }
    return node
  }
}

class CollectionRegistry implements Registry<string[]> {
  private registry: { [id: string]: string[] } = {}

  register(id: string, list: string[]) {
    this.registry[id] = list
  }

  get(id: string) {
    const list = this.registry[id]
    if (list === undefined) {
      console.warn(`Tried to access collection "${id}", but that doesn't exist`)
    }
    return list ?? []
  }
}

export interface Locale {
  [key: string]: string
}

class LocaleRegistry implements Registry<Locale> {
  private registry: { [id: string]: Locale } = {}
  language: string = ''

  register(id: string, locale: Locale): void {
    this.registry[id] = locale
  }

  get(id: string) {
    const locale = this.registry[id]
    if (locale === undefined) {
      console.warn(`Tried to access locale "${id}", but that doesn't exist`)
    }
    return locale ?? []
  }

  getLocale(key: string) {
    return this.get(this.language)[key]
  }
}

export const SCHEMAS = new SchemaRegistry()
export const COLLECTIONS = new CollectionRegistry()
export const LOCALES = new LocaleRegistry()

export const locale = (key: string | Path) => {
  if (typeof key === 'string') {
    return LOCALES.getLocale(key) ?? key
  }
  let path = key.getArray().filter(e => (typeof e === 'string'))
  while (path.length > 0) {
    const locale = LOCALES.getLocale(path.join('.'))
    if (locale !== undefined) return locale
    path.shift()
  }
  return key.last()
}

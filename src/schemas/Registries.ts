import { INode } from "../nodes/AbstractNode"

export interface Registry<T> {
  register(id: string, value: T): void
  get(id: string): T
}

class SchemaRegistry implements Registry<INode<any>> {
  private registery: { [id: string]: INode<any> } = {}

  register(id: string, node: INode<any>) {
    this.registery[id] = node
  }

  get(id: string) {
    const node = this.registery[id]
    if (node === undefined) {
      console.error(`Tried to access schema "${id}, but that doesn't exit.`)
    }
    return node
  }
}

class CollectionRegistry implements Registry<string[]> {
  private registery: { [id: string]: string[] } = {}

  register(id: string, list: string[]) {
    this.registery[id] = list
  }

  get(id: string) {
    const list = this.registery[id]
    if (list === undefined) {
      console.warn(`Tried to access collection "${id}", but that doesn't exist`)
    }
    return list ?? []
  }
}

export const SCHEMAS = new SchemaRegistry()
export const COLLECTIONS = new CollectionRegistry()


export interface INode<T> {
  setParent: (parent: INode<any>) => void
  transform: (value: T) => any
  render: (field: string, value: T) => string
}

export interface NodeChildren {
  [name: string]: INode<any>
}

export interface NodeMods<T> {
  transform?: (value: T) => any
}

export abstract class AbstractNode<T> implements INode<T> {
  private transformMod = (v: T) => v
  protected parent?: INode<any>

  constructor(mods?: NodeMods<T>) {
    if (mods?.transform) this.transformMod = mods.transform
  }

  setParent(parent: INode<any>) {
    this.parent = parent
  }

  transform(value: T) {
    return this.transformMod(value)
  }

  abstract render(field: string, value: T): string  
}

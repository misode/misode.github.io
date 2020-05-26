import { INode } from "../nodes/AbstractNode";

type Registry = {
  [id: string]: INode<any>
}

export class SchemaRegistry {
  private static registery: Registry = {}

  static register(id: string, node: INode<any>) {
    SchemaRegistry.registery[id] = node
  }

  static get(id: string): INode<any> {
    return SchemaRegistry.registery[id]
  }
}

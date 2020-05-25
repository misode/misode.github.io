import { RootNode } from "../nodes/RootNode"
import { Path } from "./Path"

export class DataModel {
  data: any
  schema: RootNode

  constructor(schema: RootNode) {
    this.schema = schema
    this.data = schema.default
  }
}

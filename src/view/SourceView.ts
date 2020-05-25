import { DataModel } from "../model/DataModel"
import { Path } from "../model/Path"

export class SourceView {
  model: DataModel

  constructor(model: DataModel) {
    this.model = model
  }

  render(target: HTMLElement) {
    target.textContent = this.model.schema.transform(this.model.data)
  }
}

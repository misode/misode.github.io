import { DataModel, ModelListener } from "../model/DataModel"
import { Path } from "../model/Path"

export class SourceView implements ModelListener {
  model: DataModel
  target: HTMLElement

  constructor(model: DataModel, target: HTMLElement) {
    this.model = model
    this.target = target
    model.addListener(this)
  }

  render() {
    const transformed = this.model.schema.transform(new Path([], this.model), this.model.data)
    this.target.textContent = JSON.stringify(transformed)
  }

  invalidated() {
    this.render()
  }
}

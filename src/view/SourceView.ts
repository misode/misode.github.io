import { DataModel, ModelListener } from "../model/DataModel"

export class SourceView implements ModelListener {
  model: DataModel
  target: HTMLElement

  constructor(model: DataModel, target: HTMLElement) {
    this.model = model
    this.target = target
    model.addListener(this)
  }

  render() {
    this.target.textContent = this.model.schema.transform(this.model.data)
  }

  invalidated() {
    this.render()
  }
}

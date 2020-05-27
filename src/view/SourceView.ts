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
    const textarea = document.createElement('textarea')
    textarea.style.width = 'calc(100% - 6px)'
    textarea.rows = 10
    textarea.textContent = JSON.stringify(transformed)
    textarea.addEventListener('change', evt => {
      const parsed = JSON.parse(textarea.value)
      this.model.reset(parsed)
    })
    this.target.innerHTML = ''
    this.target.appendChild(textarea)
  }

  invalidated() {
    this.render()
  }
}

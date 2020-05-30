import { DataModel, ModelListener } from "../model/DataModel"
import { Path } from "../model/Path"

/**
 * JSON representation view of the model.
 * Renders the result in a <textarea>.
 */
export class SourceView implements ModelListener {
  model: DataModel
  target: HTMLElement

  /**
   * @param model data model this view represents and listens to
   * @param target DOM element to render the view
   */
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

  /**
   * Re-renders the view
   * @override
   */
  invalidated() {
    this.render()
  }
}

import { DataModel, ModelListener } from "../model/DataModel"
import { Path } from "../model/Path"

type SourceViewOptions = {
  indentation?: number | string,
  rows?: number
}

/**
 * JSON representation view of the model.
 * Renders the result in a <textarea>.
 */
export class SourceView implements ModelListener {
  model: DataModel
  target: HTMLElement
  options?: SourceViewOptions

  /**
   * @param model data model this view represents and listens to
   * @param target DOM element to render the view
   * @param options optional options for the view
   */
  constructor(model: DataModel, target: HTMLElement, options?: SourceViewOptions) {
    this.model = model
    this.target = target
    this.options = options
    model.addListener(this)
  }

  render() {
    const transformed = this.model.schema.transform(new Path([], this.model), this.model.data)
    const textarea = document.createElement('textarea')
    textarea.style.width = 'calc(100% - 6px)'
    textarea.rows = this.options?.rows ?? 20
    textarea.textContent = JSON.stringify(transformed, null, this.options?.indentation)
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

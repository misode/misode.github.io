import { DataModel, Path, ModelPath } from '@mcschema/core'
import { AbstractView } from './AbstractView'
import { transformOutput } from './hooks/transformOutput'

type SourceViewOptions = {
  indentation?: number | string,
  rows?: number
}

/**
 * JSON representation view of the model.
 * Renders the result in a <textarea>.
 */
export class SourceView extends AbstractView {
  target: HTMLTextAreaElement
  options?: SourceViewOptions

  /**
   * @param model data model this view represents and listens to
   * @param target DOM element to render the view
   * @param options optional options for the view
   */
  constructor(model: DataModel, target: HTMLTextAreaElement, options?: SourceViewOptions) {
    super(model)
    this.target = target
    this.options = options
    this.target.addEventListener('change', evt => this.updateModel())
  }

  invalidated() {
    const transformed = this.model.schema.hook(transformOutput, new ModelPath(this.model), this.model.data)
    this.target.value = JSON.stringify(transformed, null, this.options?.indentation)
  }

  updateModel() {
    let parsed = {}
    try {
      parsed = JSON.parse(this.target.value)
    } catch (err) {
      this.model.error(new Path().push('JSON'), err.message)
      return
    }
    this.model.reset(parsed)
  }
}

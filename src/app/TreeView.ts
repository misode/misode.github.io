import { DataModel, ModelPath, Mounter } from '@mcschema/core'
import { AbstractView } from './AbstractView'

type Registry = {
  [id: string]: (el: Element) => void
}

type TreeViewOptions = {
  showErrors?: boolean
  observer?: (el: HTMLElement) => void
  nodeInjector?: (path: ModelPath, mounter: Mounter) => string
}

/**
 * DOM representation view of the model.
 */
export class TreeView extends AbstractView {
  target: HTMLElement
  registry: Registry = {}
  showErrors: boolean
  observer: (el: HTMLElement) => void
  nodeInjector: (path: ModelPath, mounter: Mounter) => string

  /**
   * @param model data model this view represents and listens to
   * @param target DOM element to render the view
   */
  constructor(model: DataModel, target: HTMLElement, options?: TreeViewOptions) {
    super(model)
    this.target = target
    this.showErrors = options?.showErrors ?? false
    this.observer = options?.observer ?? (() => {})
    this.nodeInjector = options?.nodeInjector ?? (() => '')
  }

  /**
   * @override
   */
  invalidated() {
    const mounter = new Mounter({nodeInjector: this.nodeInjector})
    const path = new ModelPath(this.model)
    const rendered = this.model.schema.render(path, this.model.data, mounter)
    const category = this.model.schema.category(path)
    if (rendered[1]) {
      this.target.innerHTML = `<div class="node ${this.model.schema.type(path)}-node" ${category ? `data-category="${category}"` : ''}>
        <div class="node-header">${rendered[1]}</div>
        <div class="node-body">${rendered[2]}</div>
      </div>`
    } else {
      this.target.innerHTML = rendered[2]
    }
    mounter.mount(this.target);
    this.observer(this.target)
  }
}

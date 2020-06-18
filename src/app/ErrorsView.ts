import { locale, DataModel, ModelListener } from "minecraft-schemas";
import { Errors } from "minecraft-schemas/lib/model/Errors";

export class ErrorsView implements ModelListener {
  model: DataModel
  target: HTMLElement

  constructor(model: DataModel, target: HTMLElement) {
    this.model = model
    this.target = target
    model.addListener(this)
  }

  errors(errors: Errors): void {
    this.target.style.display = errors.count() > 0 ? 'flex' : 'none'
    
    this.target.children[0].innerHTML = errors.getAll().map(err =>
      `<div class="error">
        <svg class="error-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="18" height="18"><path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z"></path></svg>
        <span class="error-path">${err.path.toString()}</span>
        <span>-</span>
        <span class="error-message">${locale(err.error, err.params)}</span>
      </div>`
    ).join('')
  }
}

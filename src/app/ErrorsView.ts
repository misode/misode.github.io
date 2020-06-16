import { AbstractView, Path, locale } from "minecraft-schemas";

export class ErrorsView extends AbstractView {
  render(): void {
    this.target.style.display = this.model.errors.count() > 0 ? 'flex' : 'none'
    
    const errors = this.model.errors.get(new Path())
    this.target.children[0].innerHTML = errors.map(err =>
      `<div class="error">
        <svg class="error-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="18" height="18"><path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z"></path></svg>
        <span class="error-path">${err.path.toString()}</span>
        <span>-</span>
        <span class="error-message">${locale(err.error, err.params)}</span>
      </div>`
    ).join('')
  }
}

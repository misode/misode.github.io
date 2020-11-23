import { DataModel } from '@mcschema/core';
import { App } from '../app_';
import { locale } from '../locales_';
import { View } from '../views/View';
import { Octicon } from './Octicon';
import { Toggle } from './Toggle';
import { htmlEncode } from '../utils_'
import { Tracker } from '../Tracker';

export const Errors = (view: View, model: DataModel) => {
  const getContent = () => {
    if (App.jsonError.get()) {
      return `<div class="error-list">
        <div class="error">
          ${htmlEncode(App.jsonError.get()!)}
        </div>
      </div>
      <div class="toggle" style="cursor: initial;">
        ${Octicon.issue_opened}
      </div>`
    }
    if (model.errors.count() === 0) return ''
    return `${App.errorsVisible.get() ? `
      <div class="error-list">
        ${model.errors.getAll().map(e => `
          <div class="error">
            <span class="error-path">${e.path.toString()}</span>
            <span>-</span>
            <span class="error-message">${htmlEncode(locale(e.error, e.params))}</span>
          </div>
        `).join('')}
      </div>
      ` : ''}
      ${Toggle(view, [[true, 'chevron_down'], [false, 'issue_opened']], App.errorsVisible, Tracker.toggleErrors)}`
  }
  const errors = view.register(el => {
    model.addListener({
      errors() {
        view.mount(el, getContent(), false)
      }
    })
    App.jsonError.watch(() => {
      view.mount(el, getContent(), false)
    })
    App.errorsVisible.watch(() => {
      view.mount(el, getContent(), false)
    }, 'errors')
  })
  return `
    <div class="errors" data-id="${errors}">
      ${getContent()}
    </div>`
}

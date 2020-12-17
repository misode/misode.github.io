import { DataModel, ModelPath, Path } from '@mcschema/core';
import { App, checkVersion, Previews } from '../../App';
import { Tracker } from '../../Tracker'
import { toggleMenu, View } from '../../views/View';
import { Octicon } from '../Octicon';
import { renderHtml } from '../../hooks/renderHtml';
import config from '../../../config.json'
import { BiomeNoisePreview } from '../../preview/BiomeNoisePreview';

export const TreePanel = (view: View, model: DataModel) => {
  const getContent = () => {
    if (App.loaded.get()) {
      const path = new ModelPath(model)
      const rendered = model.schema.hook(renderHtml, path, model.data, view)
      const category = model.schema.category(path)
      if (rendered[1]) {
        return `<div class="node ${model.schema.type(path)}-node" ${category ? `data-category="${category}"` : ''}>
          <div class="node-header">${rendered[1]}</div>
          <div class="node-body">${rendered[2]}</div>
        </div>`
      }
      return rendered[2]
    }
    return '<div class="spinner"></div>'
  }
  const tree = view.register(el => {
    App.loaded.watchRun((value) => {
      if (!value) {
        // If loading is taking more than 100 ms, show spinner
        new Promise(r => setTimeout(r, 100)).then(() => {
          if (!App.loaded.get()) {
            view.mount(el, getContent(), false)
          }
        })
      } else {
        view.mount(el, getContent(), false)
      }
    })
    model.addListener({
      invalidated() {
        view.mount(el, getContent(), false)
      }
    })
    ;(Previews.biome_noise as BiomeNoisePreview).biomeColors.watch(() => {
      view.mount(el, getContent(), false)
    }, 'tree-panel')
  })
  return `<div class="panel tree-panel">
    <div class="panel-controls">
      <div class="btn" data-id="${view.onClick(() => {
        Tracker.reset(); model.reset(model.schema.default())
      })}">
        ${Octicon.history}
        <span data-i18n="reset"></span>
      </div>
      <div class="panel-menu">
        <div class="btn" data-id="${view.onClick(toggleMenu)}">
          ${Octicon.tag}
          <span data-id="${view.register(el => App.version.watch(v => el.textContent = v, 'tree-controls'))}">
            ${App.version.get()}
          </span>
        </div>
        <div class="panel-menu-list btn-group">
          ${config.versions
            .filter(v => checkVersion(v.id, App.model.get()!.minVersion ?? '1.16'))
            .reverse()
            .map(v => `
            <div class="btn" data-id="${view.onClick(() => {
              Tracker.setVersion(v.id); App.version.set(v.id)
            })}">
              ${v.id}
            </div>
          `).join('')}
        </div>
      </div>
      <div class="panel-menu">
        <div class="btn" data-id="${view.onClick(toggleMenu)}">
          ${Octicon.kebab_horizontal}
        </div>
        <div class="panel-menu-list btn-group">
          <div class="btn" data-id="${view.onClick(() => {Tracker.undo(); model.undo()})}">
            ${Octicon.arrow_left}<span data-i18n="undo"></span>
          </div>
          <div class="btn" data-id="${view.onClick(() => {Tracker.redo(); model.redo()})}">
            ${Octicon.arrow_right}<span data-i18n="redo"></span>
          </div>
          <div class="btn">
            ${Octicon.gear}<a data-link href="/settings/fields/" data-i18n="fields"></a>
          </div>
        </div>
      </div>
    </div>
    <div class="tree" data-id="${tree}"></div>
  </div>`
}

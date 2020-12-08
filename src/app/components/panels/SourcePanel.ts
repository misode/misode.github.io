import { DataModel, ModelPath, Path } from '@mcschema/core';
import { Tracker } from '../../Tracker';
import { transformOutput } from '../../hooks/transformOutput';
import { toggleMenu, View } from '../../views/View';
import { Octicon } from '../Octicon';
import { App } from '../../App';

export const SourcePanel = (view: View, model: DataModel) => {
  const updateContent = (el: HTMLTextAreaElement) => {
    const data = model.schema.hook(transformOutput, new ModelPath(model), model.data);
    App.jsonOutput.set(JSON.stringify(data, null, 2))
    el.value = App.jsonOutput.get()
  }
  const source = view.register(el => {
    updateContent(el as HTMLTextAreaElement)
    model.addListener({
      invalidated() {
        App.jsonError.set(null)
        updateContent(el as HTMLTextAreaElement)
      }
    })
    el.addEventListener('change', () => {
      const rawSource = (el as HTMLTextAreaElement).value
      try {
        model.reset(JSON.parse(rawSource))
        App.jsonError.set(null)
      } catch (err) {
        App.jsonError.set(err.message)
      }
    })
  })
  const copySource = (el: Element) => {
    el.closest('.panel')?.getElementsByTagName('textarea')[0].select()
    document.execCommand('copy');
    Tracker.copy()
  }
  const downloadSource = (el: Element) => {
    const fileContents = encodeURIComponent(JSON.stringify(model.data, null, 2) + "\n")
    const downloadAnchor = el.lastElementChild as HTMLAnchorElement
    downloadAnchor.setAttribute('href', 'data:text/json;charset=utf-8,' + fileContents)
    downloadAnchor.setAttribute("download", "data.json")
    downloadAnchor.click()
    Tracker.download()
  }
  const shareSource = (el: Element) => {
    const shareInput = el.closest('.panel-controls')?.querySelector('input')!
    const data = btoa(JSON.stringify(JSON.parse(App.jsonOutput.get())))
    const url = window.location.origin + window.location.pathname + '?q=' + data
    shareInput.value = url
    shareInput.style.display = 'inline-block'
    document.body.addEventListener('click', evt => {
      shareInput.style.display = 'none'
    }, { capture: true, once: true })
    shareInput.select()
    document.execCommand('copy');
    Tracker.share()
  }
  return `<div class="panel source-panel">
    <div class="panel-controls">
      <input style="display: none;">
      <div class="btn" data-id="${view.onClick(copySource)}">
        ${Octicon.clippy}
        <span data-i18n="copy"></span>
      </div>
      <div class="panel-menu">
        <div class="btn" data-id="${view.onClick(toggleMenu)}">
          ${Octicon.kebab_horizontal}
        </div>
        <div class="panel-menu-list btn-group">
          <div class="btn" data-id="${view.onClick(downloadSource)}">
            ${Octicon.download}<span data-i18n="download"></span>
            <a style="diplay: none;"></a>
          </div>
          <div class="btn" data-id="${view.onClick(shareSource)}">
            ${Octicon.link}<span data-i18n="share"></span>
          </div>
        </div>
      </div>
    </div>
    <textarea class="source" data-id="${source}" spellcheck="false" autocorrect="off" autocapitalize="off"></textarea>
  </div>`
}

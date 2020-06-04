import {
  DataModel,
  IView,
  TreeView,
  SourceView,
  ConditionSchema,
  LootTableSchema,
  AdvancementSchema,
  LOCALES,
  locale
} from 'minecraft-schemas'
import Split from 'split.js'

import { SandboxSchema } from './Sandbox'


const modelFromPath = (p: string) => p.split('/').filter(e => e.length !== 0).pop() ?? ''

const addChecked = (el: HTMLElement) => {
  el.classList.add('check')
  setTimeout(() => {
    el.classList.remove('check')
  }, 2000)
}

Promise.all([
  fetch('../locales/schema/en.json').then(r => r.json()),
  fetch('../locales/app/en.json').then(r => r.json())
]).then(responses => {
  LOCALES.register('en', {...responses[0], ...responses[1]})
  LOCALES.language = 'en'

  const modelSelector = (document.getElementById('model-selector') as HTMLInputElement)
  const treeViewEl = document.getElementById('tree-view')!
  const sourceViewEl = document.getElementById('source-view')!
  const sourceViewOutput = (document.getElementById('source-view-output') as HTMLTextAreaElement)
  const sourceControlsToggle = document.getElementById('source-controls-toggle')!
  const sourceControlsMenu = document.getElementById('source-controls-menu')!
  const sourceControlsCopy = document.getElementById('source-controls-copy')!
  const sourceControlsDownload = document.getElementById('source-controls-download')!

  let selected = modelFromPath(location.pathname)

  const models: { [key: string]: DataModel } = {
    'loot-table': new DataModel(LootTableSchema),
    'predicate': new DataModel(ConditionSchema),
    'advancement': new DataModel(AdvancementSchema),
    'sandbox': new DataModel(SandboxSchema)
  }

  const views: { [key: string]: IView } = {
    'tree': new TreeView(models[selected], treeViewEl),
    'source': new SourceView(models[selected], sourceViewOutput, {indentation: 2})
  }

  const updateModel = (newModel: string) => {
    selected = newModel
    for (const v in views) {
      views[v].setModel(models[selected])
    }
    modelSelector.innerHTML = Object.keys(models)
      .map(m => `<option value=${m}${m === selected ? ' selected' : ''}>
        ${locale(`generator.${m}`)}</option>`)
      .join('')
    models[selected].invalidate()
  }
  updateModel(selected)

  Split([treeViewEl, sourceViewEl], {
    sizes: [66, 34]
  })

  modelSelector.addEventListener('change', evt => {
    const newModel = modelSelector.value
    updateModel(newModel)
    history.pushState({model: newModel}, newModel, `../${newModel}`)
  })

  window.onpopstate = (evt: PopStateEvent) => {
    updateModel(modelFromPath(location.pathname))
  }

  sourceControlsToggle.addEventListener('click', evt => {
    sourceControlsMenu.style.visibility = 'visible'
    document.body.addEventListener('click', evt => {
      sourceControlsMenu.style.visibility = 'hidden'
    }, { capture: true, once: true })
  })

  sourceControlsCopy.addEventListener('click', evt => {
    sourceViewOutput.select()
    document.execCommand('copy');
    addChecked(sourceControlsCopy)
  })

  sourceControlsDownload.addEventListener('click', evt => {
    const fileContents = encodeURIComponent(JSON.stringify(models[selected].data, null, 2) + "\n")
    const dataString = "data:text/json;charset=utf-8," + fileContents
    const downloadAnchor = document.getElementById('source-controls-download-anchor')!
    downloadAnchor.setAttribute("href", dataString)
    downloadAnchor.setAttribute("download", "data.json")
    downloadAnchor.click()
  })

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = locale(el.attributes.getNamedItem('data-i18n')!.value)
  })

  document.body.style.visibility = 'initial'
})

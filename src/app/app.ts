import {
  DataModel,
  IView,
  TreeView,
  SourceView,
  ConditionSchema,
  LootTableSchema,
  AdvancementSchema,
  LOCALES
} from 'minecraft-schemas'
import Split from 'split.js'

import { SandboxSchema } from './Sandbox'

const models: {
  [key: string]: DataModel
} = {
  'loot-table': new DataModel(LootTableSchema),
  'predicate': new DataModel(ConditionSchema),
  'advancement': new DataModel(AdvancementSchema),
  'sandbox': new DataModel(SandboxSchema)
}

let model = models["loot-table"]

const treeViewEl = document.getElementById('tree-view')!
const sourceviewEl = document.getElementById('source-view')!
const sourceviewOut = document.getElementById('source-view-output')!
Split([treeViewEl, sourceviewEl], {
  sizes: [66, 34]
})

const views: {
  [key: string]: IView
} = {
  'tree': new TreeView(model, treeViewEl),
  'source': new SourceView(model, sourceviewEl.getElementsByTagName('textarea')[0], {indentation: 2})
}

const modelSelector = (document.getElementById('model-selector') as HTMLInputElement)
modelSelector.addEventListener('change', evt => {
  model = models[modelSelector.value]
  for (const v in views) {
    views[v].setModel(model)
  }
  model.invalidate()
})

const sourceControlsToggle = document.getElementById('source-controls-toggle')!
const sourceControlsMenu = document.getElementById('source-controls-menu')!
sourceControlsToggle.addEventListener('click', evt => {
  sourceControlsMenu.style.visibility = 'visible'

  document.body.addEventListener('click', evt => {
    sourceControlsMenu.style.visibility = 'hidden'
  }, { capture: true, once: true })
})

const sourceControlsCopy = document.getElementById('source-controls-copy')!
const sourceControlsDownload = document.getElementById('source-controls-download')!
const sourceControlsShare = document.getElementById('source-controls-share')!

const addChecked = (el: HTMLElement) => {
  el.classList.add('check')
  setTimeout(() => {
    el.classList.remove('check')
  }, 2000)
}

sourceControlsCopy.addEventListener('click', evt => {
  (sourceviewOut as HTMLTextAreaElement).select()
  document.execCommand('copy');
  addChecked(sourceControlsCopy)
})

sourceControlsDownload.addEventListener('click', evt => {
  const fileContents = encodeURIComponent(JSON.stringify(model.data, null, 2) + "\n")
  const dataString = "data:text/json;charset=utf-8," + fileContents
  const downloadAnchor = document.getElementById('source-controls-download-anchor')!
  downloadAnchor.setAttribute("href", dataString)
  downloadAnchor.setAttribute("download", "data.json")
  downloadAnchor.click()
})

setTimeout(() => {
  window.scroll(0, 0)
}, 1000)

fetch('build/locales-schema/en.json')
  .then(r => r.json())
  .then(l => {
    LOCALES.register('en', l)
    LOCALES.language = 'en'

    model.invalidate()
  })

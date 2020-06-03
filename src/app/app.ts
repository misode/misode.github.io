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

let treeViewEl = document.getElementById('tree-view')!
let sourceviewEl = document.getElementById('source-view')!
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

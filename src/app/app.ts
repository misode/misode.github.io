import {
  DataModel,
  TreeView,
  SourceView,
  ConditionSchema,
  LootTableSchema,
  LOCALES
} from 'minecraft-schemas'

import { SandboxSchema } from './Sandbox'

const predicateModel = new DataModel(ConditionSchema)
const lootTableModel = new DataModel(LootTableSchema)
const sandboxModel = new DataModel(SandboxSchema)

let model = lootTableModel

const modelSelector = document.createElement('select')
modelSelector.value = 'predicate'
modelSelector.innerHTML = `
  <option value="loot-table">Loot Table</option>
  <option value="predicate">Predicate</option>
  <option value="sandbox">Sandbox</option>`
modelSelector.addEventListener('change', evt => {
  if (modelSelector.value === 'sandbox') {
    model = sandboxModel
  } else if (modelSelector.value === 'loot-table') {
    model = lootTableModel
  } else {
    model = predicateModel
  }
  new TreeView(model, document!.getElementById('view')!)
  new SourceView(model, document!.getElementById('source')!)
  model.invalidate()
})
document.getElementById('header')?.append(modelSelector)

new TreeView(model, document!.getElementById('view')!)
new SourceView(model, document!.getElementById('source')!)

fetch('build/locales/en.json')
  .then(r => r.json())
  .then(l => {
    LOCALES.register('en', l)
    LOCALES.language = 'en'

    model.invalidate()
  })

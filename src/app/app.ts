import {
  DataModel,
  TreeView,
  SourceView,
  ConditionSchema,
  LootTableSchema,
  AdvancementSchema,
  LOCALES
} from 'minecraft-schemas'

import { SandboxSchema } from './Sandbox'

const predicateModel = new DataModel(ConditionSchema)
const lootTableModel = new DataModel(LootTableSchema)
const advancementModel = new DataModel(AdvancementSchema)
const sandboxModel = new DataModel(SandboxSchema)

let model = lootTableModel

let sourceView = new SourceView(model, document.getElementById('source')!, {indentation: 2})
let treeView = new TreeView(model, document.getElementById('view')!)

const modelSelector = document.createElement('select')
modelSelector.value = 'predicate'
modelSelector.innerHTML = `
  <option value="advancement">Advancement</option>
  <option value="loot-table">Loot Table</option>
  <option value="predicate">Predicate</option>
  <option value="sandbox">Sandbox</option>`
modelSelector.addEventListener('change', evt => {
  if (modelSelector.value === 'sandbox') {
    model = sandboxModel
  } else if (modelSelector.value === 'loot-table') {
    model = lootTableModel
  }  else if (modelSelector.value === 'advancement') {
    model = advancementModel
  } else {
    model = predicateModel
  }
  sourceView.setModel(model)
  treeView.setModel(model)
  model.invalidate()
})
document.getElementById('header')?.append(modelSelector)

fetch('build/locales-schema/en.json')
  .then(r => r.json())
  .then(l => {
    LOCALES.register('en', l)
    LOCALES.language = 'en'

    model.invalidate()
  })

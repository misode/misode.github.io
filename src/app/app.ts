import { DataModel } from '../model/DataModel'
import { TreeView } from '../view/TreeView'
import { SourceView } from '../view/SourceView'
import { ConditionSchema } from '../schemas/Condition'
import { SandboxSchema } from '../schemas/Sandbox'

const predicateModel = new DataModel(ConditionSchema)
const sandboxModel = new DataModel(SandboxSchema)

let model = predicateModel

const modelSelector = document.createElement('select')
modelSelector.value = 'predicate'
modelSelector.innerHTML = `
  <option value="predicate">Predicate</option>
  <option value="sandbox">Sandbox</option>`
modelSelector.addEventListener('change', evt => {
  if (modelSelector.value === 'sandbox') {
    model = sandboxModel
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

model.invalidate()

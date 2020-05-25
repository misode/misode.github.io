import { RootNode } from '../nodes/RootNode'
import { EnumNode } from '../nodes/EnumNode'
import { ObjectNode } from '../nodes/ObjectNode'
import { StringNode } from '../nodes/StringNode'
import { DataModel } from '../model/DataModel'


const EntityCollection = ['sheep', 'pig']

const predicateTree = new RootNode('predicate', {
  condition: new EnumNode(['foo', 'bar'], {
    transform: (s: string) => (s === 'foo') ? {test: 'baz'} : s
  }),
  predicate: new ObjectNode({
    type: new EnumNode(EntityCollection, {}),
    nbt: new StringNode()
  })
}, {
  default: () => ({ condition: 'foo', predicate: { nbt: 'hi' } })
});

const model = new DataModel(predicateTree)

model.render(document!.getElementById('view')!)

// document!.getElementById('source')!.textContent = predicateTree.transform(dummyData)

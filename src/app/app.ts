import { RootNode } from '../nodes/RootNode'
import { EnumNode } from '../nodes/EnumNode'
import { ObjectNode } from '../nodes/ObjectNode'
import { StringNode } from '../nodes/StringNode'

const EntityCollection = ['sheep', 'pig']

const predicateTree = new RootNode('predicate', {
  condition: new EnumNode(['foo', 'bar'], {
    transform: (s: string) => (s === 'foo') ? {test: 'baz'} : s
  }),
  predicate: new ObjectNode({
    type: new EnumNode(EntityCollection, {}),
    nbt: new StringNode()
  })
});

let dummyData = {
  condition: 'foo',
  predicate: {
    nbt: 'hi'
  }
}

document!.getElementById('view')!.innerHTML = predicateTree.render('', dummyData)
document!.getElementById('source')!.textContent = predicateTree.transform(dummyData)

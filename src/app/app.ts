import { EnumNode } from '../nodes/EnumNode'
import { ObjectNode } from '../nodes/ObjectNode'
import { StringNode } from '../nodes/StringNode'

const EntityCollection = ['sheep', 'pig']

const predicateTree = {
  id: 'predicate',
  fields: {
    condition: new EnumNode(['foo', 'bar'], {
      transform: (s: string) => (s === 'foo') ? {predicate: 'baz'} : s
    }),
    predicate: new ObjectNode({
      type: new EnumNode(EntityCollection, {}),
      nbt: new StringNode()
    })
  }
};

function renderTree(tree: any, data: any) {
  return Object.keys(tree.fields).map(f =>
    tree.fields[f].render(f, data[f])
  ).join('<br>');
}

function serializeTree(tree: any, data: any) {
  let res: any = {}
  Object.keys(tree.fields).forEach(f =>
    res[f] = tree.fields[f].transform(data[f])
  )
  return JSON.stringify(res);
}

let dummyData = {
  condition: 'foo',
  chance: 0.4,
  predicate: {
    nbt: 'hi'
  }
}

document!.getElementById('view')!.innerHTML = renderTree(predicateTree, dummyData)
document!.getElementById('source')!.textContent = serializeTree(predicateTree, dummyData)

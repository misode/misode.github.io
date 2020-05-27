import { ObjectNode } from '../nodes/ObjectNode';
import { EnumNode } from '../nodes/EnumNode';
import { ResourceNode } from '../nodes/custom/ResourceNode';
import { NumberNode } from '../nodes/NumberNode';
import { BooleanNode } from '../nodes/BooleanNode';
import { RootNode } from '../nodes/RootNode';
import { RangeNode } from '../nodes/custom/RangeNode';
import { MapNode } from '../nodes/MapNode';
import { StringNode } from '../nodes/StringNode';
import { ListNode } from '../nodes/ListNode';

const EntityCollection = ['sheep', 'pig']

export const SandboxSchema = new RootNode('predicate', {
  condition: new EnumNode(['foo', 'bar'], {
    default: () => 'bar',
    transform: (s: string) => (s === 'foo') ? {test: 'baz'} : s
  }),
  number: new NumberNode({integer: false, min: 0}),
  range: new RangeNode({
    enable: (path) => path.push('condition').get() === 'foo'
  }),
  predicate: new ObjectNode({
    type: new EnumNode(EntityCollection),
    nbt: new ResourceNode({
      default: (v) => 'hahaha'
    }),
    test: new BooleanNode({force: () => true}),
    recipes: new MapNode(
      new StringNode(),
      new RangeNode({
        default: (v) => RangeNode.isExact(v) ? 2 : v
      })
    )
  }),
  effects: new ListNode(
    new ObjectNode({
      type: new EnumNode(EntityCollection),
      nbt: new StringNode()
    }, {
      default: () => ({
        type: 'sheep'
      })
    })
  )
}, {
  default: () => ({
    condition: 'foo',
    predicate: {
      nbt: 'hi'
    }
  })
});

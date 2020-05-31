import {
  ObjectNode,
  EnumNode,
  StringNode,
  NumberNode,
  BooleanNode,
  RangeNode,
  MapNode,
  ListNode
} from 'minecraft-schemas'

const EntityCollection = ['sheep', 'pig']

export const SandboxSchema = new ObjectNode({
  condition: new EnumNode(['foo', 'bar'], {
    default: () => 'bar'
  }),
  number: new NumberNode({integer: false, min: 0}),
  range: new RangeNode({
    enable: (path) => path.push('condition').get() === 'foo'
  }),
  predicate: new ObjectNode({
    type: new EnumNode(EntityCollection),
    nbt: new StringNode({
      default: (v) => 'hahaha'
    }),
    test: new BooleanNode({force: () => true}),
    recipes: new MapNode(
      new StringNode(),
      new RangeNode({
        default: (v) => RangeNode.isExact(v) ? 2 : v,
        transform: (v: any) => RangeNode.isRange(v) ? ({
          min: v?.min ?? -2147483648,
          max: v?.max ?? 2147483647
        }) : v
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
  }),
  transform: (v: any) => v?.condition === 'foo' ? ({...v, test: 'hello'}) : v
});

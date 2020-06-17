import {
  StringNode,
  BooleanNode,
  EnumNode,
  NumberNode,
  ObjectNode,
  ListNode,
  MapNode,
  Switch,
  Case,
  Reference,
  JsonNode,
  RangeNode,
  Resource,
  SCHEMAS
} from 'minecraft-schemas'

SCHEMAS.register('foo', ObjectNode({
  foo: StringNode(),
  bar: BooleanNode({ radio: true }),
  nested: ObjectNode({
    baz: NumberNode({ min: 1 }),
    range: RangeNode()
  }, { collapse: true }),
  arr: ListNode(
    ObjectNode({
      aaa: StringNode(),
      bbb: JsonNode()
    })
  ),
  map: MapNode(
    EnumNode(['pig', 'sheep']),
    Resource(StringNode())
  ),
  recursive: ListNode(
    Reference('foo')
  ),
  [Switch]: path => path.push('foo'),
  [Case]: {
    'blah': {
      haha: StringNode()
    }
  }
}))

export const SandboxSchema = SCHEMAS.get('foo')

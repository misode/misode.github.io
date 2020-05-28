import { ObjectNode } from '../nodes/ObjectNode';
import { ResourceNode } from '../nodes/custom/ResourceNode';
import { EnumNode } from '../nodes/EnumNode';
import { ListNode } from '../nodes/ListNode';
import { RangeNode } from '../nodes/custom/RangeNode';
import { StringNode } from '../nodes/StringNode';
import { ReferenceNode } from '../nodes/ReferenceNode';
import { BooleanNode } from '../nodes/BooleanNode';
import { MapNode } from '../nodes/MapNode';
import { SCHEMAS, COLLECTIONS } from './Registries';

import './Collections'

SCHEMAS.register('item-predicate', new ObjectNode({
  item: new ResourceNode(COLLECTIONS.get('items')),
  tag: new StringNode(),
  count: new RangeNode(),
  durability: new RangeNode(),
  potion: new StringNode(),
  nbt: new StringNode(),
  enchantments: new ListNode(
    new ReferenceNode('enchantment-predicate')
  )
}))

SCHEMAS.register('enchantment-predicate', new ObjectNode({
  enchantment: new ResourceNode(COLLECTIONS.get('enchantments')),
  levels: new RangeNode()
}))

SCHEMAS.register('block-predicate', new ObjectNode({
  block: new ResourceNode(COLLECTIONS.get('blocks')),
  tag: new StringNode(),
  nbt: new StringNode(),
  state: new MapNode(
    new StringNode(),
    new StringNode()
  )
}))

SCHEMAS.register('fluid-predicate', new ObjectNode({
  fluid: new ResourceNode(COLLECTIONS.get('fluids')),
  tag: new StringNode(),
  nbt: new StringNode(),
  state: new MapNode(
    new StringNode(),
    new StringNode()
  )
}))

SCHEMAS.register('location-predicate', new ObjectNode({
  position: new ObjectNode({
    x: new RangeNode(),
    y: new RangeNode(),
    z: new RangeNode()
  }),
  biome: new ResourceNode(COLLECTIONS.get('biomes')),
  feature: new EnumNode(COLLECTIONS.get('structures')),
  dimension: new ResourceNode(COLLECTIONS.get('dimensions'), {additional: true}),
  light: new ObjectNode({
    light: new RangeNode()
  }),
  smokey: new BooleanNode(),
  block: new ReferenceNode('block-predicate'),
  fluid: new ReferenceNode('fluid-predicate')
}))

SCHEMAS.register('statistic-predicate', new ObjectNode({
  type: new EnumNode(COLLECTIONS.get('statistic-types')),
  stat: new StringNode(),
  value: new RangeNode()
}))

SCHEMAS.register('player-predicate', new ObjectNode({
  gamemode: new EnumNode(COLLECTIONS.get('gamemodes')),
  level: new RangeNode(),
  advancements: new MapNode(
    new StringNode(),
    new BooleanNode()
  ),
  recipes: new MapNode(
    new StringNode(),
    new BooleanNode()
  ),
  stats: new ListNode(
    new ReferenceNode('statistic-predicate')
  )
}))

SCHEMAS.register('status-effect', new ObjectNode({
  amplifier: new RangeNode(),
  duration: new RangeNode(),
  ambient: new BooleanNode(),
  visible: new BooleanNode()
}))

SCHEMAS.register('distance-predicate', new ObjectNode({
  x: new RangeNode(),
  y: new RangeNode(),
  z: new RangeNode(),
  absolute: new RangeNode(),
  horizontal: new RangeNode()
}))

SCHEMAS.register('entity-predicate', new ObjectNode({
  type: new StringNode(),
  nbt: new StringNode(),
  team: new StringNode(),
  location: new ReferenceNode('location-predicate'),
  distance: new ReferenceNode('distance-predicate'),
  flags: new ObjectNode({
    is_on_fire: new BooleanNode(),
    is_sneaking: new BooleanNode(),
    is_sprinting: new BooleanNode(),
    is_swimming: new BooleanNode(),
    is_baby: new BooleanNode()
  }),
  equipment: new MapNode(
    new EnumNode(COLLECTIONS.get('slots')),
    new ReferenceNode('item-predicate')
  ),
  // vehicle: new ReferenceNode('entity-predicate'),
  // targeted_entity: new ReferenceNode('entity-predicate'),
  player: new ReferenceNode('player-predicate'),
  fishing_hook: new ObjectNode({
    in_open_water: new BooleanNode()
  }),
  effects: new MapNode(
    new ResourceNode(COLLECTIONS.get('status-effects')),
    new ReferenceNode('status-effect-predicate')
  )
}))

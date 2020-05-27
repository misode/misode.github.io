import { ObjectNode } from '../nodes/ObjectNode';
import { ResourceNode } from '../nodes/custom/ResourceNode';
import { EnumNode } from '../nodes/EnumNode';
import { ListNode } from '../nodes/ListNode';
import { RangeNode } from '../nodes/custom/RangeNode';
import { StringNode } from '../nodes/StringNode';
import { ReferenceNode } from '../nodes/ReferenceNode';
import { SchemaRegistry } from './SchemaRegistry';
import { BooleanNode } from '../nodes/BooleanNode';
import { MapNode } from '../nodes/MapNode';
import {
  enchantments,
  biomes,
  structures,
  dimensions,
  slots,
  statusEffects,
  gameModes,
  statisticTypes
} from './Collections'

SchemaRegistry.register('item-predicate', new ObjectNode({
  item: new ResourceNode(),
  tag: new StringNode(),
  count: new RangeNode(),
  durability: new RangeNode(),
  potion: new StringNode(),
  nbt: new StringNode(),
  enchantments: new ListNode(
    new ReferenceNode('enchantment-predicate')
  )
}))

SchemaRegistry.register('enchantment-predicate', new ObjectNode({
  enchantment: new EnumNode(enchantments),
  levels: new RangeNode()
}))

SchemaRegistry.register('block-predicate', new ObjectNode({
  block: new ResourceNode(),
  tag: new StringNode(),
  nbt: new StringNode(),
  state: new MapNode(
    new StringNode(),
    new StringNode()
  )
}))

SchemaRegistry.register('fluid-predicate', new ObjectNode({
  fluid: new ResourceNode(),
  tag: new StringNode(),
  nbt: new StringNode(),
  state: new MapNode(
    new StringNode(),
    new StringNode()
  )
}))

SchemaRegistry.register('location-predicate', new ObjectNode({
  position: new ObjectNode({
    x: new RangeNode(),
    y: new RangeNode(),
    z: new RangeNode()
  }),
  biome: new EnumNode(biomes),
  feature: new EnumNode(structures),
  dimension: new EnumNode(dimensions),
  light: new ObjectNode({
    light: new RangeNode()
  }),
  smokey: new BooleanNode(),
  block: new ReferenceNode('block-predicate'),
  fluid: new ReferenceNode('fluid-predicate')
}))

SchemaRegistry.register('statistic-predicat', new ObjectNode({
  type: new EnumNode(statisticTypes),
  stat: new StringNode(),
  value: new RangeNode()
}))

SchemaRegistry.register('player-predicate', new ObjectNode({
  gamemode: new EnumNode(gameModes),
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

SchemaRegistry.register('status-effect', new ObjectNode({
  amplifier: new RangeNode(),
  duration: new RangeNode(),
  ambient: new BooleanNode(),
  visible: new BooleanNode()
}))

SchemaRegistry.register('distance-predicate', new ObjectNode({
  x: new RangeNode(),
  y: new RangeNode(),
  z: new RangeNode(),
  absolute: new RangeNode(),
  horizontal: new RangeNode()
}))

SchemaRegistry.register('entity-predicate', new ObjectNode({
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
    new EnumNode(slots),
    new ReferenceNode('item-predicate')
  ),
  // vehicle: new ReferenceNode('entity-predicate'),
  // targeted_entity: new ReferenceNode('entity-predicate'),
  player: new ReferenceNode('player-predicate'),
  fishing_hook: new ObjectNode({
    in_open_water: new BooleanNode()
  }),
  effects: new MapNode(
    new EnumNode(statusEffects),
    new ReferenceNode('status-effect-predicate')
  )
}))

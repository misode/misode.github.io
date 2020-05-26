import { EnumNode } from '../nodes/EnumNode';
import { ResourceNode } from '../nodes/custom/ResourceNode';
import { NumberNode } from '../nodes/NumberNode';
import { BooleanNode } from '../nodes/BooleanNode';
import { FilteredNode, Switch } from '../nodes/FilteredNode';
import { ListNode } from '../nodes/ListNode';
import { RangeNode } from '../nodes/custom/RangeNode';
import { MapNode } from '../nodes/MapNode';
import { StringNode } from '../nodes/StringNode';
import { ReferenceNode } from '../nodes/ReferenceNode';
import { SchemaRegistry } from './SchemaRegistry';

import { conditions, enchantments } from './Collections'

const entitySources = ['this', 'killer', 'killer_player']

export const ConditionSchema = new FilteredNode('condition', {
  condition: new EnumNode(conditions, 'random_chance'),
  [Switch]: {
    'alternative': {
      terms: new ListNode(
        new ReferenceNode('condition')
      ),
    },
    'block_state_property': {
      block: new ResourceNode(),
      properties: new MapNode(
        new StringNode(),
        new StringNode()
      ),
    },
    'damage_source_properties': {
      // predicate: DamageSchema,
    },
    'entity_properties': {
      entity: new EnumNode(entitySources, 'this'),
      // predicate: EntitySchema,
    },
    'entity_scores': {
      entity: new EnumNode(entitySources, 'this'),
      scores: new MapNode(
        new StringNode(),
        new RangeNode()
      )
    },
    'inverted': {
      term: new ReferenceNode('condition')
    },
    'killed_by_player': {
      inverse: new BooleanNode()
    },
    'location_check': {
      offsetX: new NumberNode({integer: true}),
      offsetY: new NumberNode({integer: true}),
      offsetZ: new NumberNode({integer: true}),
      // predicate: LocationSchema,
    },
    'match_tool': {
      // predicate: ItemSchema,
    },
    'random_chance': {
      chance: new NumberNode({min: 0, max: 1}),
    },
    'random_chance_with_looting': {
      chance: new NumberNode({min: 0, max: 1}),
      looting_multiplier: new NumberNode(),
    },
    'requirements': {
      terms: new ListNode(
        new ReferenceNode('condition')
      ),
    },
    'reference': {
      name: new StringNode(),
    },
    'table_bonus': {
      enchantment: new EnumNode(enchantments),
      chances: new ListNode(
        new NumberNode({min: 0, max: 1})
      ),
    },
    'time_check': {
      value: new RangeNode(),
      period: new NumberNode(),
    },
    'weather_check': {
      raining: new BooleanNode(),
      thrundering: new BooleanNode(),
    }
  }
}, {
  default: () => ({
    condition: 'random_chance',
    chance: 0.5
  })
})

SchemaRegistry.register('condition', ConditionSchema)

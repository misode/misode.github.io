import { EnumNode } from '../nodes/EnumNode';
import { ResourceNode } from '../nodes/custom/ResourceNode';
import { NumberNode } from '../nodes/NumberNode';
import { BooleanNode } from '../nodes/BooleanNode';
import { ObjectNode, Switch, Case } from '../nodes/ObjectNode';
import { ListNode } from '../nodes/ListNode';
import { RangeNode } from '../nodes/custom/RangeNode';
import { MapNode } from '../nodes/MapNode';
import { StringNode } from '../nodes/StringNode';
import { ReferenceNode } from '../nodes/ReferenceNode';
import { SCHEMAS, COLLECTIONS } from './Registries';

import './Predicates'

SCHEMAS.register('condition', new ObjectNode({
  condition: new ResourceNode(COLLECTIONS.get('conditions'), {default: () => 'random_chance'}),
  [Switch]: 'condition',
  [Case]: {
    'alternative': {
      terms: new ListNode(
        new ReferenceNode('condition')
      )
    },
    'block_state_property': {
      block: new ResourceNode(COLLECTIONS.get('blocks')),
      properties: new MapNode(
        new StringNode(),
        new StringNode()
      )
    },
    'damage_source_properties': {
      predicate: new ReferenceNode('damage-source-predicate')
    },
    'entity_properties': {
      entity: new EnumNode(COLLECTIONS.get('entity-sources'), 'this'),
      predicate: new ReferenceNode('entity-predicate')
    },
    'entity_scores': {
      entity: new EnumNode(COLLECTIONS.get('entity-sources'), 'this'),
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
      predicate: new ReferenceNode('location-predicate')
    },
    'match_tool': {
      predicate: new ReferenceNode('item-predicate')
    },
    'random_chance': {
      chance: new NumberNode({min: 0, max: 1})
    },
    'random_chance_with_looting': {
      chance: new NumberNode({min: 0, max: 1}),
      looting_multiplier: new NumberNode()
    },
    'requirements': {
      terms: new ListNode(
        new ReferenceNode('condition')
      ),
    },
    'reference': {
      name: new StringNode()
    },
    'table_bonus': {
      enchantment: new ResourceNode(COLLECTIONS.get('enchantments')),
      chances: new ListNode(
        new NumberNode({min: 0, max: 1})
      )
    },
    'time_check': {
      value: new RangeNode(),
      period: new NumberNode()
    },
    'weather_check': {
      raining: new BooleanNode(),
      thrundering: new BooleanNode()
    }
  }
}, {
  default: () => ({
    condition: 'random_chance',
    chance: 0.5
  })
}))

export const ConditionSchema = SCHEMAS.get('condition')

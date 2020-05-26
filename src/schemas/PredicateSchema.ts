import { EnumNode } from '../nodes/EnumNode';
import { ResourceNode } from '../nodes/custom/ResourceNode';
import { NumberNode } from '../nodes/NumberNode';
import { BooleanNode } from '../nodes/BooleanNode';
import { FilteredNode, Switch } from '../nodes/FilteredNode';
import { ListNode } from '../nodes/ListNode';
import { RangeNode } from '../nodes/custom/RangeNode';
import { MapNode } from '../nodes/MapNode';
import { StringNode } from '../nodes/StringNode';
import { INode } from '../nodes/AbstractNode';

const conditions = [
  'alternative',
  'requirements',
  'inverted',
  'reference',
  'entity_properties',
  'block_state_property',
  'match_tool',
  'damage_source_properties',
  'location_check',
  'weather_check',
  'time_check',
  'entity_scores',
  'random_chance',
  'random_chance_with_looting',
  'table_bonus',
  'killed_by_player',
  'survives_explosion'
]

const enchantments = [
  'aqua_affinity',
  'bane_of_arthropods',
  'blast_protection',
  'channeling',
  'binding_curse',
  'vanishing_curse',
  'depth_strider',
  'efficiency',
  'feather_falling',
  'fire_aspect',
  'fire_protection',
  'flame',
  'fortune',
  'frost_walker',
  'impaling',
  'infinity',
  'knockback',
  'looting',
  'loyalty',
  'luck_of_the_sea',
  'lure',
  'mending',
  'multishot',
  'piercing',
  'power',
  'projectile_protection',
  'protection',
  'punch',
  'quick_charge',
  'respiration',
  'riptide',
  'sharpness',
  'silk_touch',
  'smite',
  'sweeping',
  'thorns',
  'unbreaking'
]

const entitySources = ['this', 'killer', 'killer_player']

export let PredicateSchema: FilteredNode
PredicateSchema = new FilteredNode('condition', {
  condition: new EnumNode(conditions, 'random_chance'),
  [Switch]: {
    'alternative': {
      // terms: new ListNode(PredicateSchema()),
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
      // term: PredicateSchema,
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

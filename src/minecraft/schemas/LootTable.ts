import { EnumNode } from '../../nodes/EnumNode';
import { ResourceNode } from '../nodes/ResourceNode';
import { NumberNode } from '../../nodes/NumberNode';
import { BooleanNode } from '../../nodes/BooleanNode';
import { ObjectNode, Switch, Case } from '../../nodes/ObjectNode';
import { ListNode } from '../../nodes/ListNode';
import { RangeNode } from '../nodes/RangeNode';
import { MapNode } from '../../nodes/MapNode';
import { StringNode } from '../../nodes/StringNode';
import { ReferenceNode } from '../../nodes/ReferenceNode';
import { SCHEMAS, COLLECTIONS } from '../../Registries';

import './Predicates'

const conditions = {
  conditions: new ListNode(
    new ReferenceNode('condition')
  )
}

const functionsAndConditions = {
  functions: new ListNode(
    new ReferenceNode('loot-function')
  ),
  ...conditions
}

SCHEMAS.register('loot-table', new ObjectNode({
  pools: new ListNode(
    new ObjectNode({
      rolls: new RangeNode(),
      entries: new ListNode(
        new ReferenceNode('loot-entry')
      )
    })
  ),
  ...functionsAndConditions
}, {
  default: () => ({
    pools: [
      {
        rolls: 1,
        entries: [
          {
            type: 'item',
            name: 'minecraft:stone'
          }
        ]
      }
    ]
  })
}))

SCHEMAS.register('loot-entry', new ObjectNode({
  type: new EnumNode(COLLECTIONS.get('loot-entries'), {default: () => 'item'}),
  weight: new NumberNode({
    integer: true,
    min: 1,
    enable: path => path.pop().get()?.length > 1
      && !['alternatives', 'group', 'sequence'].includes(path.push('type').get())
  }),
  [Switch]: 'type',
  [Case]: {
    'alternatives': {
      children: new ListNode(
        new ReferenceNode('loot-entry')
      ),
      ...functionsAndConditions
    },
    'dynamic': {
      name: new StringNode(),
      ...functionsAndConditions
    },
    'group': {
      children: new ListNode(
        new ReferenceNode('loot-entry')
      ),
      ...functionsAndConditions
    },
    'item': {
      name: new StringNode(),
      ...functionsAndConditions
    },
    'loot_table': {
      name: new StringNode(),
      ...functionsAndConditions
    },
    'sequence': {
      children: new ListNode(
        new ReferenceNode('loot-entry')
      ),
      ...functionsAndConditions
    },
    'tag': {
      name: new StringNode(),
      expand: new BooleanNode(),
      ...functionsAndConditions
    }
  }
}))

SCHEMAS.register('loot-function', new ObjectNode({
  function: new EnumNode(COLLECTIONS.get('loot-functions'), {default: () => 'set_count'}),
  [Switch]: 'function',
  [Case]: {
    'apply_bonus': {
      enchantment: new EnumNode(COLLECTIONS.get('enchantments')),
      formula: new EnumNode([
        'uniform_bonus_count',
        'binomial_with_bonus_count',
        'ore_drops'
      ]),
      parameters: new ObjectNode({
        bonusMultiplier: new NumberNode({
          enable: path => path.pop().push('formula').get() === 'uniform_bonus_count'
        }),
        extra: new NumberNode({
          enable: path => path.pop().push('formula').get() === 'binomial_with_bonus_count'
        }),
        probability: new NumberNode({
          enable: path => path.pop().push('formula').get() === 'binomial_with_bonus_count'
        })
      }, {
        enable: path => path.push('formula').get() !== 'ore_drops'
      }),
      ...conditions
    },
    'copy_name': {
      source: new EnumNode(COLLECTIONS.get('copy-sources')),
      ...conditions
    },
    'copy_nbt': {
      source: new EnumNode(COLLECTIONS.get('copy-sources')),
      ops: new ListNode(
        new ObjectNode({
          source: new StringNode(),
          target: new StringNode(),
          op: new EnumNode(['replace', 'append', 'merge'])
        })
      ),
      ...conditions
    },
    'copy_state': {
      block: new ResourceNode(COLLECTIONS.get('blocks')),
      properties: new ListNode(
        new StringNode()
      ),
      ...conditions
    },
    'enchant_randomly': {
      enchantments: new ListNode(
        new EnumNode(COLLECTIONS.get('enchantments'))
      ),
      ...conditions
    },
    'enchant_with_levels': {
      levels: new RangeNode(),
      treasure: new BooleanNode(),
      ...conditions
    },
    'exploration_map': {
      destination: new EnumNode(COLLECTIONS.get('structures')),
      decoration: new EnumNode(COLLECTIONS.get('map-decorations')),
      zoom: new NumberNode({integer: true}),
      search_radius: new NumberNode({integer: true}),
      skip_existing_chunks: new BooleanNode(),
      ...conditions
    },
    'fill_player_head': {
      entity: new EnumNode(COLLECTIONS.get('entity-sources')),
      ...conditions
    },
    'limit_count': {
      limit: new RangeNode(),
      ...conditions
    },
    'looting_enchant': {
      count: new RangeNode(),
      limit: new NumberNode({integer: true}),
      ...conditions
    },
    'set_attributes': {
      modifiers: new ListNode(
        new ReferenceNode('attribute-modifier')
      ),
      ...conditions
    },
    'set_contents': {
      entries: new ListNode(
        new ReferenceNode('loot-entry')
      ),
      ...conditions
    },
    'set_count': {
      count: new RangeNode(),
      ...conditions
    },
    'set_damage': {
      damage: new RangeNode(),
      ...conditions
    },
    'set_lore': {
      entity: new EnumNode(COLLECTIONS.get('entity-sources')),
      lore: new ListNode(
        new StringNode()
      ),
      replace: new BooleanNode(),
      ...conditions
    },
    'set_name': {
      entity: new EnumNode(COLLECTIONS.get('entity-sources')),
      name: new StringNode(),
      ...conditions
    },
    'set_nbt': {
      tag: new StringNode(),
      ...conditions
    },
    'set_stew_effect': {
      effects: new ListNode(
        new ReferenceNode('potion-effect')
      ),
      ...conditions
    }
  }
}, {
  default: () => ({
    function: 'set_count',
    count: 1
  })
}))

SCHEMAS.register('attribute-modifier', new ObjectNode({
  attribute: new EnumNode(COLLECTIONS.get('attributes')),
  name: new StringNode(),
  amount: new RangeNode(),
  operation: new EnumNode([
    'addition',
    'multiply_base',
    'multiply_total'
  ]),
  slot: new ListNode(
    new EnumNode(COLLECTIONS.get('slots'))
  )
}))

export const LootTableSchema = SCHEMAS.get('loot-table')

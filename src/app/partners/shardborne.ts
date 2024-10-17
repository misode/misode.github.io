import type { CollectionRegistry, SchemaRegistry } from '@mcschema/core'
import {
	BooleanNode,
	Case,
	ChoiceNode,
	ListNode,
	Mod,
	NumberNode,
	ObjectNode,
	Opt,
	Reference as RawReference,
	StringNode as RawStringNode,
	Switch,
} from '@mcschema/core'
import { Tag } from '../common/common.js'

const ID = 'shardborne'

export function initShardborne(schemas: SchemaRegistry, collections: CollectionRegistry) {
	const Reference = RawReference.bind(undefined, schemas)
	const StringNode = RawStringNode.bind(undefined, collections)

	collections.register('shardborne:features', ['shardborne:custom_npc', 'shardborne:processor_rules'])

	collections.register(`${ID}:npcs`, [
		'shardborne:wisp',
		'shardborne:meld',
		'shardborne:sage',
		'shardborne:juuno',
		'shardborne:aldhor',
	])

	schemas.register(`${ID}:npc_type`, StringNode({ validator: 'resource', params: { pool: `${ID}:npcs` as any } }))

	collections.register(`${ID}:block`, [...collections.get('block'), 'shardborne:custom_block'])

	schemas.register(
		`${ID}:item_type`,
		ObjectNode({
			id: StringNode({ validator: 'resource', params: { pool: `${ID}:block` as any } }),
			count: Opt(NumberNode({ max: 64 })),
			nbt: Opt(StringNode()),
		})
	)

	schemas.register(
		`${ID}:shardborne_dialogue_type`,
		ListNode(
			ObjectNode({
				type: StringNode({ enum: ['text', 'display_item', 'give_item'] }),
				[Switch]: [{ push: 'type' }],
				[Case]: {
					text: {
						text: ListNode(StringNode()),
					},
					give_item: {
						item: Reference(`${ID}:item_type`),
					},
					display_item: {
						text: ListNode(StringNode()),
						item: Reference(`${ID}:item_type`),
					},
				},
			}),
			{ minLength: 1 }
		)
	)
	schemas.register(
		`${ID}:shardborne_requirement_type`,
		ListNode(
			ObjectNode({
				type: StringNode({ enum: ['enter_dimension', 'locate_structure'] }),
				[Switch]: [{ push: 'type' }],
				[Case]: {
					enter_dimension: {
						dimension: StringNode({ validator: 'resource', params: { pool: '$dimension' } }),
					},
					locate_structure: {
						structure: StringNode({ validator: 'resource', params: { pool: '$structure' } }),
					},
				},
			})
		)
	)

	schemas.register(
		`${ID}:shardborne_prerequisites_type`,
		ListNode(
			ObjectNode({
				type: StringNode({ enum: ['quest_lines'] }),
				[Switch]: [{ push: 'type' }],
				[Case]: {
					questline: {
						quests: ListNode(StringNode()),
					},
				},
			})
		)
	)

	schemas.register(
		'shardborne:custom_npc',
		Mod(
			ObjectNode(
				{
					id: StringNode(),
					prerequisites: Opt(Reference(`${ID}:shardborne_prerequisites_type`)),
					quests: ListNode(
						ObjectNode({
							id: StringNode(),
							npc: Reference(`${ID}:npc_type`),
							initial_dialogue: Reference(`${ID}:shardborne_dialogue_type`),
							finished_dialogue: Opt(Reference(`${ID}:shardborne_dialogue_type`)),
							requirements: Reference(`${ID}:shardborne_requirement_type`),
							satisfied_dialogue: Opt(Reference(`${ID}:shardborne_dialogue_type`)),
							unsatisfied_dialogue: Reference(`${ID}:shardborne_dialogue_type`),
						})
					),
					random_dialogue: ListNode(
						ObjectNode({
							npc: Reference(`${ID}:npc_type`),
							dialogue: Reference(`${ID}:shardborne_dialogue_type`),
						})
					),
				},
				{ context: 'shardborne.custom_npc' }
			),
			{
				default: () => ({
					id: 'questline_one',
				}),
			}
		)
	)

	schemas.register(
		'shardborne:processor_rules',
		ObjectNode(
			{
				processor_type: StringNode({
					enum: [
						'shardborne:dungeon_room_processor',
						'shardborne:block_replacement_processor',
						...collections
							.get('worldgen/structure_processor')
							.filter((value) => value !== 'minecraft:block_rot'),
					],
				}),
				[Switch]: [{ push: 'processor_type' }],
				[Case]: {
					'minecraft:block_age': {
						mossiness: NumberNode(),
					},
					'shardborne:dungeon_room_processor': {
						target: StringNode({ validator: 'resource', params: { pool: `${ID}:block` as any } }),
						success_replacement: StringNode({
							validator: 'resource',
							params: { pool: `${ID}:block` as any },
						}),
						fail_replacement: Opt(
							StringNode({ validator: 'resource', params: { pool: `${ID}:block` as any } })
						),
						min_blocks: NumberNode(),
						max_blocks: NumberNode(),
						replacement_chance: NumberNode({ min: 0, max: 1 }),
					},
					'shardborne:block_replacement_processor': {
						input_block: StringNode({
							validator: 'resource',
							params: { pool: `${ID}:block` as any },
						}),
						output_block: StringNode({
							validator: 'resource',
							params: { pool: `${ID}:block` as any },
						}),
						probability: Opt(NumberNode({ min: 0, max: 1 })),
					},
					'minecraft:block_ignore': {
						blocks: ListNode(Reference('block_state')),
					},
					'minecraft:block_rot': {
						integrity: NumberNode({ min: 0, max: 1 }),
						rottable_blocks: Opt(Tag({ resource: 'block' })),
					},
					'minecraft:gravity': {
						heightmap: StringNode({ enum: 'heightmap_type' }),
						offset: NumberNode({ integer: true }),
					},
					'minecraft:protected_blocks': {
						value: StringNode({
							validator: 'resource',
							params: { pool: `${ID}:block` as any, requireTag: true },
						}),
					},
					'minecraft:rule': {
						rules: ListNode(Reference('processor_rule')),
					},
				},
			},
			{ context: 'processor', category: 'function' }
		)
	)
	schemas.register(
		'shardborne:processors',
		Mod(
			ObjectNode({
				processors: ListNode(Reference('shardborne:processor_rules')),
			}),
			{
				default: () => ({
					processors: [{ processor_type: 'shardborne:block_replacement_processor' }],
				}),
			}
		)
	)

	const Processors = ChoiceNode([
		{
			type: 'string',
			node: StringNode({ validator: 'resource', params: { pool: '$worldgen/processor_list' } }),
			change: (v) => undefined,
		},
		{
			type: 'list',
			node: ListNode(Reference('processor')),
			change: (v) =>
				typeof v === 'object' && v !== null && Array.isArray(v.processors)
					? v.processors
					: [{ processor_type: 'minecraft:nop' }],
		},
		{
			type: 'object',
			node: Reference('processor_list'),
			change: (v) => ({
				processors: Array.isArray(v) ? v : [{ processor_type: 'minecraft:nop' }],
			}),
		},
	])

	schemas.register(
		'shardborne:template_element',
		ObjectNode(
			{
				element_type: StringNode({
					enum: ['shardborne:dungeon_pool_element', ...collections.get('worldgen/structure_pool_element')],
				}),
				[Switch]: [{ push: 'element_type' }],
				[Case]: {
					'minecraft:feature_pool_element': {
						projection: StringNode({ enum: ['rigid', 'terrain_matching'] }),
						feature: StringNode({ validator: 'resource', params: { pool: '$worldgen/placed_feature' } }),
					},
					'minecraft:legacy_single_pool_element': {
						projection: StringNode({ enum: ['rigid', 'terrain_matching'] }),
						location: StringNode({ validator: 'resource', params: { pool: '$structure' } }),
						processors: Processors,
					},
					'shardborne:dungeon_pool_element': {
						projection: StringNode({ enum: ['rigid', 'terrain_matching'] }),
						location: StringNode({ validator: 'resource', params: { pool: '$structure' } }),
						processors: ListNode(StringNode()),
						allow_overlap: Mod(Opt(BooleanNode()), { default: () => false }),
						is_room: Mod(Opt(BooleanNode()), { default: () => false }),
						disable_block_replacement: Mod(Opt(BooleanNode()), { default: () => false }),
					},
					'minecraft:list_pool_element': {
						projection: StringNode({ enum: ['rigid', 'terrain_matching'] }),
						elements: ListNode(Reference('template_element')),
					},
					'minecraft:single_pool_element': {
						projection: StringNode({ enum: ['rigid', 'terrain_matching'] }),
						location: StringNode({ validator: 'resource', params: { pool: '$structure' } }),
						processors: Processors,
					},
				},
			},
			{ context: 'template_element', category: 'function' }
		)
	)

	schemas.register(
		'shardborne:template_pools',
		Mod(
			ObjectNode({
				fallback: StringNode(),
				elements: ListNode(
					ObjectNode({
						weight: NumberNode({ integer: true, min: 1, max: 150 }),
						element: Reference('shardborne:template_element'),
					})
				),
			}),
			{
				default: () => ({
					fallback: 'minecraft:empty',
					elements: [
						{
							weight: 1,
							element: {
								element_type: 'minecraft:single_pool_element',
								projection: 'rigid',
								processors: 'minecraft:empty',
							},
						},
					],
				}),
			}
		)
	)
}

import type { CollectionRegistry, SchemaRegistry } from '@mcschema/core'
import {
	Case,
	ListNode,
	Mod,
	NumberNode,
	ObjectNode,
	Opt,
	Reference as RawReference,
	StringNode as RawStringNode,
	Switch,
} from '@mcschema/core'
import { Tag } from '../../common/common.js'
import { ID } from './index.js'

export function initProcessors(schemas: SchemaRegistry, collections: CollectionRegistry) {
	const StringNode = RawStringNode.bind(undefined, collections)
	const Reference = RawReference.bind(undefined, schemas)

	schemas.register(
		`${ID}:processor_rules`,
		ObjectNode(
			{
				processor_type: StringNode({
					enum: [
						`${ID}:dungeon_room_processor`,
						`${ID}:block_replacement_processor`,
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
					[`${ID}:dungeon_room_processor`]: {
						target: StringNode({ validator: 'resource', params: { pool: 'block' } }),
						success_replacement: StringNode({
							validator: 'resource',
							params: { pool: 'block' },
						}),
						fail_replacement: Opt(StringNode({ validator: 'resource', params: { pool: 'block' } })),
						min_blocks: NumberNode(),
						max_blocks: NumberNode(),
						replacement_chance: NumberNode({ min: 0, max: 1 }),
					},
					[`${ID}:block_replacement_processor`]: {
						input_block: StringNode({
							validator: 'resource',
							params: { pool: 'block' },
						}),
						output_block: StringNode({
							validator: 'resource',
							params: { pool: 'block' },
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
							params: { pool: 'block', requireTag: true },
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
		`${ID}:processors`,
		Mod(
			ObjectNode({
				processors: ListNode(Reference(`${ID}:processor_rules`)),
			}),
			{
				default: () => ({
					processors: [{ processor_type: `${ID}:block_replacement_processor` }],
				}),
			}
		)
	)
}

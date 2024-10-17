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

const ID = 'shardborne'

export function initShardborne(schemas: SchemaRegistry, collections: CollectionRegistry) {
	const Reference = RawReference.bind(undefined, schemas)
	const StringNode = RawStringNode.bind(undefined, collections)

	collections.register('shardborne:features', ['shardborne:custom_npc'])

	collections.register(`${ID}:npcs`, [
		'shardborne:wisp',
		'shardborne:meld',
		'shardborne:sage',
		'shardborne:juuno',
		'shardborne:aldhor',
	])

	schemas.register(`${ID}:npc_type`, StringNode({ validator: 'resource', params: { pool: `${ID}:npcs` as any } }))

	schemas.register(
		`${ID}:item_type`,
		ObjectNode({
			id: StringNode({ validator: 'resource', params: { pool: 'block' } }),
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
}

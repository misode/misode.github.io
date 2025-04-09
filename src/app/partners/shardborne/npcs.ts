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
import { ID } from './index.js'

export function initNPCs(schemas: SchemaRegistry, collections: CollectionRegistry) {
	const StringNode = RawStringNode.bind(undefined, collections)
	const Reference = RawReference.bind(undefined, schemas)

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
		`${ID}:dialogue_type`,
		ListNode(
			ObjectNode({
				type: StringNode({ enum: ['text', 'display_item', 'give_item', 'give_recipe'] }),
				[Switch]: [{ push: 'type' }],
				[Case]: {
					text: {
						text: ListNode(StringNode()),
					},
					give_recipe: {
						recipe: ListNode(StringNode({ validator: 'resource', params: { pool: '$recipe' } })),
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
		`${ID}:requirement_type`,
		ListNode(
			ObjectNode({
				type: StringNode({ enum: ['enter_dimension', 'locate_structure', 'carry_item', 'make_recipe'] }),
				[Switch]: [{ push: 'type' }],
				[Case]: {
					enter_dimension: {
						dimension: StringNode({ validator: 'resource', params: { pool: `${ID}:dimensions` as any } }),
					},
					locate_structure: {
						structure: StringNode({ validator: 'resource', params: { pool: '$structure' } }),
					},
					carry_item: {
						item: Reference(`${ID}:item_type`),
					},
					make_recipe: {
						item: Reference(`${ID}:item_type`),
					},
				},
			})
		)
	)

	schemas.register(
		`${ID}:prerequisites_type`,
		ListNode(
			ObjectNode({
				type: StringNode({ enum: ['questline', 'level'] }),
				[Switch]: [{ push: 'type' }],
				[Case]: {
					questline: {
						questlines: ListNode(StringNode()),
					},
					level: {
						level: NumberNode({ min: 0 }),
					},
				},
			})
		)
	)

	schemas.register(
		`${ID}:custom_npc`,
		Mod(
			ObjectNode(
				{
					id: StringNode(),
					prerequisites: Opt(Reference(`${ID}:prerequisites_type`)),
					quests: ListNode(
						ObjectNode({
							id: StringNode(),
							npc: Reference(`${ID}:npc_type`),
							initial_dialogue: Reference(`${ID}:dialogue_type`),
							finished_dialogue: Opt(Reference(`${ID}:dialogue_type`)),
							requirements: Reference(`${ID}:requirement_type`),
							satisfied_dialogue: Opt(Reference(`${ID}:dialogue_type`)),
							unsatisfied_dialogue: Reference(`${ID}:dialogue_type`),
						})
					),
					random_dialogue: ListNode(
						ObjectNode({
							npc: Reference(`${ID}:npc_type`),
							dialogue: Reference(`${ID}:dialogue_type`),
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

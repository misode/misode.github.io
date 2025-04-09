import type { CollectionRegistry, SchemaRegistry } from '@mcschema/core'
import { ListNode, Mod, NumberNode, ObjectNode, StringNode as RawStringNode } from '@mcschema/core'
import { ID } from './index.js'

export function initMobSpawning(schemas: SchemaRegistry, collections: CollectionRegistry) {
	const StringNode = RawStringNode.bind(undefined, collections)

	schemas.register(
		`${ID}:mob_spawning`,
		Mod(
			ObjectNode({
				groups: ListNode(
					ObjectNode({
						group_id: StringNode({ validator: 'resource', params: { pool: [] } }),
						weight: NumberNode({ integer: true }),
					})
				),
				id: StringNode({ validator: 'resource', params: { pool: [] } }),
				max_spawn_cost: NumberNode({ integer: true, min: 0 }),
				min_spawn_cost: NumberNode({ integer: true, min: 0 }),
			}),
			{
				default: () => {
					groups: []
				},
			}
		)
	)
}

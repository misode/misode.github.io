import type { CollectionRegistry, SchemaRegistry } from '@mcschema/core'
import { ChoiceNode, MapNode, Mod, NumberNode, ObjectNode, StringNode as RawStringNode } from '@mcschema/core'
import { ID } from './index.js'

export function initTheme(schemas: SchemaRegistry, collections: CollectionRegistry) {
	const StringNode = RawStringNode.bind(undefined, collections)

	schemas.register(
		`${ID}:theme`,
		Mod(
			ObjectNode(
				{
					processor: StringNode({ validator: 'resource', params: { pool: '$worldgen/processor_list' } }),
					weight: NumberNode({ integer: true, min: 1, max: 100 }),
					generation_type: ChoiceNode([
						{
							type: 'string',
							node: StringNode({ enum: ['open_world', 'maze'] }),
							change: () => undefined,
						},
					]),
					biome: StringNode({ validator: 'resource', params: { pool: '$worldgen/biome' } }),
					structures: MapNode(
						StringNode({ validator: 'resource', params: { pool: '$structure' } }),
						ObjectNode({
							min: NumberNode({ integer: true }),
							max: NumberNode({ integer: true }),
						})
					),
					theme_settings_id: StringNode(),
				},
				{ context: 'shardborne.themes' }
			),
			{
				default: () => ({}),
			}
		)
	)
}

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
import { ID } from './index.js'

export function initTemplatePool(schemas: SchemaRegistry, collections: CollectionRegistry) {
	const Reference = RawReference.bind(undefined, schemas)
	const StringNode = RawStringNode.bind(undefined, collections)

	const Processors = ChoiceNode([
		{
			type: 'string',
			node: StringNode({ validator: 'resource', params: { pool: '$worldgen/processor_list' } }),
			change: () => undefined,
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
		`${ID}:template_element`,
		ObjectNode(
			{
				element_type: StringNode({
					enum: [`${ID}:dungeon_pool_element`, ...collections.get('worldgen/structure_pool_element')],
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
					[`${ID}:dungeon_pool_element`]: {
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
		`${ID}:template_pools`,
		Mod(
			ObjectNode({
				fallback: StringNode(),
				elements: ListNode(
					ObjectNode({
						weight: NumberNode({ integer: true, min: 1, max: 150 }),
						element: Reference(`${ID}:template_element`),
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

import type { CollectionRegistry, SchemaRegistry } from '@mcschema/core'
import { Case, ListNode, Mod, NumberNode, ObjectNode, Opt, Reference as RawReference, StringNode as RawStringNode, Switch } from '@mcschema/core'

export function initOhTheTreesYoullGrow(schemas: SchemaRegistry, collections: CollectionRegistry) {
	const Reference = RawReference.bind(undefined, schemas)
	const StringNode = RawStringNode.bind(undefined, collections)
	
	collections.register('ohthetreesyoullgrow:feature', [
		'ohthetreesyoullgrow:tree_from_nbt_v1',
	])

	const BlockSet = ListNode(
		StringNode({ validator: 'resource', params: { pool: 'block' } })
	)

	schemas.register('ohthetreesyoullgrow:configured_feature', Mod(ObjectNode({
		type: StringNode({ validator: 'resource', params: { pool: 'ohthetreesyoullgrow:feature' as any } }),
		config: ObjectNode({
			[Switch]: ['pop', { push: 'type' }],
			[Case]: {
				'ohthetreesyoullgrow:tree_from_nbt_v1': {
					base_location: StringNode({ validator: 'resource', params: { pool: '$structure' } }),
					canopy_location: StringNode({ validator: 'resource', params: { pool: '$structure' } }),
					can_grow_on_filter: Reference('block_predicate_worldgen'),
					can_leaves_place_filter: Reference('block_predicate_worldgen'),
					decorators: Opt(ListNode(
						ObjectNode({
							type: StringNode({ validator: 'resource', params: { pool: 'worldgen/tree_decorator_type' } }),
							[Switch]: [{ push: 'type' }],
							[Case]: {
								'minecraft:alter_ground': {
									provider: Reference('block_state_provider'),
								},
								'minecraft:attached_to_leaves': {
									probability: NumberNode({ min: 0, max: 1 }),
									exclusion_radius_xz: NumberNode({ integer: true, min: 0, max: 16 }),
									exclusion_radius_y: NumberNode({ integer: true, min: 0, max: 16 }),
									required_empty_blocks: NumberNode({ integer: true, min: 1, max: 16 }),
									block_provider: Reference('block_state_provider'),
									directions: ListNode(
										StringNode({ enum: 'direction' })
									),
								},
								'minecraft:beehive': {
									probability: NumberNode({ min: 0, max: 1 }),
								},
								'minecraft:cocoa': {
									probability: NumberNode({ min: 0, max: 1 }),
								},
								'minecraft:leave_vine': {
									probability: NumberNode({ min: 0, max: 1 }),
								},
							},
						}, { context: 'tree_decorator' })
					)),
					height: Reference('int_provider'),
					leaves_provider: Reference('block_state_provider'),
					leaves_target: BlockSet,
					log_provider: Reference('block_state_provider'),
					log_target: BlockSet,
					max_log_depth: Opt(NumberNode({ integer: true })),
					place_from_nbt: BlockSet,
				},
			},
		}, { disableSwitchContext: true }),
	}, { context: 'ohthetreesyoullgrow.configured_feature' }), {
		default: () => ({
			type: 'ohthetreesyoullgrow:tree_from_nbt_v1',
			config: {
				can_grow_on_filter: {
					type: 'minecraft:matching_block_tag',
					tag: 'minecraft:dirt',
				},
				can_leaves_place_filter: {
					type: 'minecraft:replaceable',
				},
				height: {
					type: 'minecraft:uniform',
					value: {
						min_inclusive: 5,
						max_inclusive: 10,
					},
				},
				leaves_provider: {
					type: 'minecraft:simple_state_provider',
					state: {
						Name: 'minecraft:acacia_leaves',
						Properties: {
							distance: '7',
							persistent: 'false',
							waterlogged: 'false',
						},
					},
				},
				leaves_target: [
					'minecraft:oak_leaves',
				],
				log_provider: {
					type: 'minecraft:simple_state_provider',
					state: {
						Name: 'minecraft:acacia_log',
						Properties: {
							axis: 'y',
						},
					},
				},
				log_target: [
					'minecraft:oak_log',
				],
				place_from_nbt: [],
			},
		}),
	}))
}

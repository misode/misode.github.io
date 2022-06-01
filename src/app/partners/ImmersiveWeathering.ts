import type { CollectionRegistry, ResourceType, SchemaRegistry } from '@mcschema/core'
import { BooleanNode, Case, ChoiceNode, ListNode, MapNode, NumberNode, ObjectNode, Opt, Reference as RawReference, StringNode as RawStringNode, Switch } from '@mcschema/core'

const ID = 'immersive_weathering'

export function initImmersiveWeathering(schemas: SchemaRegistry, collections: CollectionRegistry) {
	const Reference = RawReference.bind(undefined, schemas)
	const StringNode = RawStringNode.bind(undefined, collections)

	const Tag = (id: Exclude<ResourceType, `$tag/${string}`>) => ChoiceNode([
		{
			type: 'string',
			node: StringNode({ validator: 'resource', params: { pool: id, allowTag: true } }),
			change: (v: unknown) => {
				if (Array.isArray(v) && typeof v[0] === 'string' && !v[0].startsWith('#')) {
					return v[0]
				}
				return undefined
			},
		},
		{
			type: 'list',
			node: ListNode(
				StringNode({ validator: 'resource', params: { pool: id } })
			),
			change: (v: unknown) => {
				if (typeof v === 'string' && !v.startsWith('#')) {
					return [v]
				}
				return []
			},
		},
	], { choiceContext: 'tag' })

	schemas.register(`${ID}:block_growth`, ObjectNode({
		area_condition: Reference(`${ID}:area_condition`),
		position_predicates: Opt(ListNode(
			Reference(`${ID}:position_test`)
		)),
		growth_chance: NumberNode({ min: 0, max: 1 }),
		growth_for_face: ListNode(
			ObjectNode({
				direction: Opt(StringNode({ enum: 'direction' })),
				weight: Opt(NumberNode({ integer: true })),
				growth: ListNode(
					ObjectNode({
						data: Reference(`${ID}:block_pair`),
						weight: NumberNode({ integer: true }),
					})
				),
			}, { category: 'pool' })
		),
		owners: ListNode(
			StringNode({ validator: 'resource', params: { pool: 'block' } })
		),
		replacing_target: Reference(`${ID}:rule_test`),
		target_self: Opt(BooleanNode()),
		destroy_target: Opt(BooleanNode()),
	}, { context: `${ID}.block_growth` }))

	schemas.register(`${ID}:area_condition`, ObjectNode({
		type: StringNode({ enum: ['generate_if_not_too_many', 'neighbor_based_generation'] }),
		[Switch]: [{ push: 'type' }],
		[Case]: {
			generate_if_not_too_many: {
				radiusX: NumberNode({ integer: true }),
				radiusY: NumberNode({ integer: true }),
				radiusZ: NumberNode({ integer: true }),
				requiredAmount: NumberNode({ integer: true }),
				yOffset: Opt(NumberNode({ integer: true })),
				must_have: Opt(Reference(`${ID}:rule_test`)),
				must_not_have: Opt(Reference(`${ID}:rule_test`)),
				includes: Opt(Tag('block')),
			},
			neighbor_based_generation: {
				must_have: Reference(`${ID}:rule_test`),
				must_not_have: Opt(Reference(`${ID}:rule_test`)),
				required_amount: Opt(NumberNode({ integer: true })),
				directions: ListNode(
					StringNode({ enum: 'direction' })
				),
			},
		},
	}, { context: `${ID}.area_condition` }))

	schemas.register(`${ID}:block_pair`, ObjectNode({
		block: Reference(`${ID}:block_state`),
		above_block: Opt(Reference(`${ID}:block_state`)),
	}, { context: `${ID}.block_pair` }))

	schemas.register(`${ID}:block_state`, ObjectNode({
		Name: StringNode({ validator: 'resource', params: { pool: 'block' } }),
		Properties: Opt(MapNode(
			StringNode(),
			StringNode(),
		)),
	}, { context: 'block_state' }))

	schemas.register(`${ID}:position_test`, ObjectNode({
		predicate_type: StringNode({ enum: ['biome_match', 'day_test', 'nand', 'precipitation_test', 'temperature_range'] }),
		[Switch]: [{ push: 'predicate_type' }],
		[Case]: {
			biome_match: {
				biomes: Tag('$worldgen/biome'),
			},
			day_test: {
				day: BooleanNode(),
			},
			nand: {
				predicates: ListNode(
					Reference(`${ID}:position_test`)
				),
			},
			precipitation_test: {
				precipitation: StringNode({ enum: ['none', 'rain', 'snow']}),
			},
			temperature_range: {
				min: NumberNode(),
				max: NumberNode(),
				use_local_pos: Opt(BooleanNode()),
			},
		},
	}, { context: `${ID}.position_test`, category: 'predicate' }))

	collections.register(`${ID}:rule_test`, [
		...collections.get('rule_test'),
		'immersive_weathering:block_set_match',
		'immersive_weathering:fluid_match',
		'immersive_weathering:tree_log',
	])

	schemas.register(`${ID}:rule_test`, ObjectNode({
		predicate_type: StringNode({ validator: 'resource', params: { pool: `${ID}:rule_test` as any } }),
		[Switch]: [{ push: 'predicate_type' }],
		[Case]: {
			'minecraft:block_match': {
				block: StringNode({ validator: 'resource', params: { pool: 'block' } }),
			},
			'minecraft:blockstate_match': {
				block_state: Reference('block_state'),
			},
			'minecraft:random_block_match': {
				block: StringNode({ validator: 'resource', params: { pool: 'block' } }),
				probability: NumberNode({ min: 0, max: 1 }),
			},
			'minecraft:random_blockstate_match': {
				block_state: Reference('block_state'),
				probability: NumberNode({ min: 0, max: 1 }),
			},
			'minecraft:tag_match': {
				tag: StringNode({ validator: 'resource', params: { pool: '$tag/block' }}),
			},
			'immersive_weathering:block_set_match': {
				blocks: Tag('block'),
				probability: Opt(NumberNode({ min: 0, max: 1 })),
			},
			'immersive_weathering:fluid_match': {
				fluid: StringNode({ validator: 'resource', params: { pool: 'fluid' } }),
			},
		},
	}, { context: 'rule_test', disableSwitchContext: true }))

	collections.register('block_growth', [
		'immersive_weathering:brain_coral',
		'immersive_weathering:bubble_coral',
		'immersive_weathering:cracked_mud_rivers',
		'immersive_weathering:crimson_nylium',
		'immersive_weathering:cryosol',
		'immersive_weathering:farmland_rare_weeds',
		'immersive_weathering:farmland_weeds',
		'immersive_weathering:fire_coral',
		'immersive_weathering:fire_soot',
		'immersive_weathering:fluvisol',
		'immersive_weathering:grass_base',
		'immersive_weathering:grass_block_badlands',
		'immersive_weathering:grass_block_bamboo_jungle',
		'immersive_weathering:grass_block_birch_forest',
		'immersive_weathering:grass_block_dark_forest',
		'immersive_weathering:grass_block_flower_forest',
		'immersive_weathering:grass_block_forest',
		'immersive_weathering:grass_block_jungle',
		'immersive_weathering:grass_block_lush_caves',
		'immersive_weathering:grass_block_old_growth_spruce',
		'immersive_weathering:grass_block_plains',
		'immersive_weathering:grass_block_sunflower_plains',
		'immersive_weathering:grass_block_swamp',
		'immersive_weathering:grass_block_taiga',
		'immersive_weathering:grass_block_wooded_badlands',
		'immersive_weathering:hanging_roots',
		'immersive_weathering:horn_coral',
		'immersive_weathering:humus',
		'immersive_weathering:icicle_growth',
		'immersive_weathering:large_fern',
		'immersive_weathering:magma',
		'immersive_weathering:mycelium',
		'immersive_weathering:podzol',
		'immersive_weathering:red_sand_weathering',
		'immersive_weathering:rooted_dirt',
		'immersive_weathering:rooted_grass',
		'immersive_weathering:sand_weathering',
		'immersive_weathering:sapling',
		'immersive_weathering:sapling_nether',
		'immersive_weathering:silt',
		'immersive_weathering:tall_grass',
		'immersive_weathering:tall_seagrass',
		'immersive_weathering:tube_coral',
		'immersive_weathering:vertisol',
		'immersive_weathering:warped_nylium',
	])
}

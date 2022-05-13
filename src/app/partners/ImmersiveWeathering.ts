import type { CollectionRegistry, ResourceType, SchemaRegistry } from '@mcschema/core'
import { BooleanNode, Case, ChoiceNode, ListNode, NumberNode, ObjectNode, Opt, Reference as RawReference, StringNode as RawStringNode, Switch } from '@mcschema/core'

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
			})
		),
		owners: ListNode(
			StringNode({ validator: 'resource', params: { pool: 'block' } })
		),
		replacing_target: Reference('rule_test'),
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
				must_have: Opt(Reference('rule_test')),
				must_not_have: Opt(Reference('rule_test')),
				includes: Opt(Tag('block')),
			},
			neighbor_based_generation: {
				must_have: Reference('rule_test'),
				must_not_have: Opt(Reference('rule_test')),
				required_amount: Opt(NumberNode({ integer: true })),
				directions: ListNode(
					StringNode({ enum: 'direction' })
				),
			},
		},
	}, { context: `${ID}.area_condition` }))

	schemas.register(`${ID}:block_pair`, ObjectNode({
		block: Reference('block_state'),
		above_block: Opt(Reference('block_state')),
	}, { context: `${ID}.block_pair` }))

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
	}))
}

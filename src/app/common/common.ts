import type {
	CollectionRegistry,
	INode,
	NestedNodeChildren,
	NodeChildren,
	ResourceType,
	SchemaRegistry,
} from '@mcschema/core'
import {
	BooleanNode,
	ChoiceNode,
	ListNode,
	MapNode,
	NumberNode,
	ObjectNode,
	Opt,
	Reference as RawReference,
	StringNode as RawStringNode,
} from '@mcschema/core'

type NonTagResources = Exclude<ResourceType, `$tag/${string}`>

type TagConfig = {
	resource: NonTagResources
	inlineSchema?: string
}
export let Tag: (config: TagConfig) => INode
export let ConditionCases: (entitySourceNode?: INode<any>) => NestedNodeChildren
export let FunctionCases: (
	conditions: NodeChildren,
	copySourceNode?: INode<any>,
	entitySourceNode?: INode<any>
) => NestedNodeChildren

export function initCommonSchemas(schemas: SchemaRegistry, collections: CollectionRegistry) {
	const StringNode = RawStringNode.bind(undefined, collections)
	const Reference = RawReference.bind(undefined, schemas)

	ConditionCases = (entitySourceNode: INode<any> = StringNode({ enum: 'entity_source' })) => ({
		'minecraft:all_of': {
			terms: ListNode(Reference('condition')),
		},
		'minecraft:any_of': {
			terms: ListNode(Reference('condition')),
		},
		'minecraft:block_state_property': {
			block: StringNode({ validator: 'resource', params: { pool: 'block' } }),
			properties: MapNode(StringNode(), StringNode(), {
				validation: { validator: 'block_state_map', params: { id: ['pop', { push: 'block' }] } },
			}),
		},
		'minecraft:damage_source_properties': {
			predicate: Reference('damage_source_predicate'),
		},
		'minecraft:entity_properties': {
			entity: entitySourceNode,
			predicate: Reference('entity_predicate'),
		},
		'minecraft:entity_scores': {
			entity: entitySourceNode,
			scores: MapNode(StringNode({ validator: 'objective' }), Reference('int_range')),
		},
		'minecraft:inverted': {
			term: Reference('condition'),
		},
		'minecraft:killed_by_player': {
			inverse: Opt(BooleanNode()),
		},
		'minecraft:location_check': {
			offsetX: Opt(NumberNode({ integer: true })),
			offsetY: Opt(NumberNode({ integer: true })),
			offsetZ: Opt(NumberNode({ integer: true })),
			predicate: Reference('location_predicate'),
		},
		'minecraft:match_tool': {
			predicate: Reference('item_predicate'),
		},
		'minecraft:random_chance': {
			chance: NumberNode({ min: 0, max: 1 }),
		},
		'minecraft:random_chance_with_looting': {
			chance: NumberNode({ min: 0, max: 1 }),
			looting_multiplier: NumberNode(),
		},
		'minecraft:reference': {
			name: StringNode({ validator: 'resource', params: { pool: '$predicate' } }),
		},
		'minecraft:table_bonus': {
			enchantment: StringNode({ validator: 'resource', params: { pool: 'enchantment' } }),
			chances: ListNode(NumberNode({ min: 0, max: 1 })),
		},
		'minecraft:time_check': {
			value: Reference('int_range'),
			period: Opt(NumberNode({ integer: true })),
		},
		'minecraft:value_check': {
			value: Reference('number_provider'),
			range: Reference('int_range'),
		},
		'minecraft:weather_check': {
			raining: Opt(BooleanNode()),
			thundering: Opt(BooleanNode()),
		},
		'shardborne:dungeon_level': {
			range: ObjectNode({
				min: Opt(Reference('number_provider')),
				max: Opt(Reference('number_provider')),
			}),
		},
		'shardborne:dungeon_category': {
			value: StringNode(),
		},
	})

	Tag = (config: TagConfig) =>
		ChoiceNode(
			[
				{
					type: 'string',
					node: StringNode({ validator: 'resource', params: { pool: config.resource, allowTag: true } }),
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
						config.inlineSchema
							? ChoiceNode(
									[
										{
											type: 'string',
											node: StringNode({
												validator: 'resource',
												params: { pool: config.resource },
											}),
										},
										{
											type: 'object',
											node: Reference(config.inlineSchema),
										},
									],
									{ choiceContext: 'tag.list' }
							  )
							: StringNode({ validator: 'resource', params: { pool: config.resource } })
					),
					change: (v: unknown) => {
						if (typeof v === 'string' && !v.startsWith('#')) {
							return [v]
						}
						return ['']
					},
				},
			],
			{ choiceContext: 'tag' }
		)
}

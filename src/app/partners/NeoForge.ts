import type { CollectionRegistry, INode, ResourceType, SchemaRegistry } from '@mcschema/core'
import { BooleanNode, Case, ChoiceNode, ListNode, MapNode, Mod, NumberNode, ObjectNode, Opt, StringNode as RawStringNode, Switch } from '@mcschema/core'
import type { VersionId } from '../services/Schemas.js'

const ID = 'neoforge'

export function initNeoForge(schemas: SchemaRegistry, collections: CollectionRegistry, _version: VersionId) {
	const StringNode = RawStringNode.bind(undefined, collections)

	// Homogenous list (ref, list of refs, tag)
	const Tag = (id: Exclude<ResourceType, `$tag/${string}`>) =>
		ChoiceNode(
			[
				{
					type: 'string',
					node: StringNode({
						validator: 'resource',
						params: { pool: id, allowTag: true },
					}),
					change: (v: unknown) => {
						if (
							Array.isArray(v) &&
							typeof v[0] === 'string' &&
							!v[0].startsWith('#')
						) {
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
			],
			{ choiceContext: 'tag' }
		)
	
	// Spawner data
	const MobCategorySpawnSettings = Mod(
		ObjectNode({
			type: StringNode({ validator: 'resource', params: { pool: 'entity_type' }}),
			weight: NumberNode({ integer: true, min: 0 }),
			minCount: NumberNode({ integer: true, min: 1 }),
			maxCount: NumberNode({ integer: true, min: 1 }),
		}),
		{
			category: () => 'pool',
			default: () => [
				{
					type: 'minecraft:bat',
					weight: 1,
				},
			],
		}
	)

	// Generation step carving
	const CarvingStep = StringNode({ enum: [ 'air', 'liquid' ] })

	// Mob category
	const MobCategory = StringNode({ enum: [ 'monster', 'creature', 'ambient', 'axolotls', 'underground_water_creature', 'water_creature', 'water_ambient', 'misc' ], additional: true })

	// Biome modifier types
	collections.register(`${ID}:biome_modifier_type`, [
		'neoforge:none',
		'neoforge:add_features',
		'neoforge:remove_features',
		'neoforge:add_spawns',
		'neoforge:remove_spawns',
		'neoforge:add_carvers',
		'neoforge:remove_carvers',
		'neoforge:add_spawn_costs',
		'neoforge:remove_spawn_costs',
	])

	// Biome modifiers
	schemas.register(`${ID}:biome_modifier`, Mod(
		ObjectNode({
			type: StringNode({ validator: 'resource', params: { pool: `${ID}:biome_modifier_type` as any }}),
			[Switch]: [{ push: 'type' }],
			[Case]: {
				'neoforge:none': {},
				'neoforge:add_features': {
					biomes: Tag('$worldgen/biome'),
					features: Tag('$worldgen/placed_feature'),
					step: StringNode({ enum: 'decoration_step' }),
				},
				'neoforge:remove_features': {
					biomes: Tag('$worldgen/biome'),
					features: Tag('$worldgen/placed_feature'),
					steps: Opt(ChoiceNode([
						{
							type: 'string',
							node: StringNode({ enum: 'decoration_step' }),
							change: (v: any) => v[0],
						},
						{
							type: 'list',
							node: ListNode(StringNode({ enum: 'decoration_step' })),
							change: (v: any) => Array(v),
						},
					])),
				},
				'neoforge:add_spawns': {
					biomes: Tag('$worldgen/biome'),
					spawners: ChoiceNode([
						{
							type: 'object',
							node: MobCategorySpawnSettings,
							change: (v: any) => v[0],
						},
						{
							type: 'list',
							node: MobCategorySpawnSettings,
							change: (v: any) => Array(v),
						},
					]),
				},
				'neoforge:remove_spawns': {
					biomes: Tag('$worldgen/biome'),
					entity_types: Tag('entity_type'),
				},
				'neoforge:add_carvers': {
					biomes: Tag('$worldgen/biome'),
					carvers: Tag('$worldgen/configured_carver'),
					step: CarvingStep,
				},
				'neoforge:remove_carvers': {
					biomes: Tag('$worldgen/biome'),
					carvers: Tag('$worldgen/configured_carver'),
					steps: Opt(ChoiceNode([
						{
							type: 'string',
							node: CarvingStep,
							change: (v: any) => v[0],
						},
						{
							type: 'list',
							node: ListNode(CarvingStep),
							change: (v: any) => Array(v),
						},
					])),
				},
				'neoforge:add_spawn_costs': {
					biomes: Tag('$worldgen/biome'),
					entity_types: Tag('entity_type'),
					spawn_cost: ObjectNode({
						energy_budget: NumberNode(),
						charge: NumberNode(),
					}),
				},
				'neoforge:remove_spawn_costs': {
					biomes: Tag('$worldgen/biome'),
					entity_types: Tag('entity_type'),
				},
			},
		}, { context: `${ID}.biome_modifier`, disableSwitchContext: true }),
		{
			default: () => ({
				type: `${ID}:add_features`,
				biomes: '#minecraft:is_overworld',
				features: 'minecraft:ore_iron_small',
				step: 'underground_ores',
			}),
		}
	))

	// Structure modifier types
	collections.register(`${ID}:structure_modifier_type`, [
		'neoforge:none',
		'neoforge:add_spawns',
		'neoforge:remove_spawns',
		'neoforge:clear_spawns',
	])

	// Structure modifiers
	schemas.register(`${ID}:structure_modifier`, Mod(
		ObjectNode({
			type: StringNode({ validator: 'resource', params: { pool: `${ID}:structure_modifier_type` as any }}),
			[Switch]: [{ push: 'type' }],
			[Case]: {
				'neoforge:none': {},
				'neoforge:add_spawns': {
					structures: Tag('$worldgen/structure'),
					spawners: ChoiceNode([
						{
							type: 'object',
							node: MobCategorySpawnSettings,
							change: (v: any) => v[0],
						},
						{
							type: 'list',
							node: MobCategorySpawnSettings,
							change: (v: any) => Array(v),
						},
					]),
				},
				'neoforge:remove_spawns': {
					structures: Tag('$worldgen/structure'),
					entity_types: Tag('entity_type'),
				},
				'neoforge:clear_spawns': {
					structures: Tag('$worldgen/structure'),
					categories: ChoiceNode([
						{
							type: 'string',
							node: MobCategory,
							change: (v: any) => v[0],
						},
						{
							type: 'list',
							node: MobCategory,
							change: (v: any) => Array(v),
						},
					]),
				},
			},
		}, { context: `${ID}.structure_modifier`, disableSwitchContext: true }),
		{
			default: () => ({
				type: `${ID}:add_spawns`,
				structures: '#minecraft:village',
				spawners: {
					type: 'minecraft:bat',
					weight: 1,
				},
			}),
		}
	))

	// Data maps
	createDataMap(schemas, collections, 'compostables', 'item', ChoiceNode([
		{
			type: 'number',
			node: NumberNode({
				min: 0,
				max: 1,
			}),
			change: (v: any) => v?.chance,
		},
		{
			type: 'object',
			node: ObjectNode({
				chance: NumberNode({
					min: 0,
					max: 1,
				}),
				can_villager_compost: Opt(BooleanNode()),
			}),
			change: (v: any) => ({
				chance: v,
				can_villager_compost: false,
			}),
		},
	]), (values) => values['minecraft:apple'] = {
		chance: 1,
		can_villager_compost: true,
	}
	)
	createDataMap(schemas, collections, 'furnace_fuels', 'item', ChoiceNode([
		{
			type: 'number',
			node: NumberNode({
				min: 1,
				integer: true,
			}),
			change: (v: any) => v?.burn_time,
		},
		{
			type: 'object',
			node: ObjectNode({
				burn_time: NumberNode({
					min: 1,
					integer: true,
				}),
			}),
			change: (v: any) => ({
				burn_time: v,
			}),
		},
	]), (values) => values['minecraft:chest'] = {
		burn_time: 300,
	}
	)
	createDataMap(schemas, collections, 'monster_room_mobs', 'entity_type', ChoiceNode([
		{
			type: 'number',
			node: NumberNode({
				min: 0,
				integer: true,
			}),
			change: (v: any) => v?.weight,
		},
		{
			type: 'object',
			node: ObjectNode({
				weight: NumberNode({
					min: 0,
					integer: true,
				}),
			}),
			change: (v: any) => ({
				weight: v,
			}),
		},
	]), (values) => values['minecraft:bat'] = {
		weight: 5,
	})
	createDataMap(schemas, collections, 'oxidizables', 'block', ChoiceNode([
		{
			type: 'string',
			node: StringNode({
				validator: 'resource',
				params: { pool: 'block' },
			}),
			change: (v: any) => v?.next_oxidation_stage,
		},
		{
			type: 'object',
			node: ObjectNode({
				next_oxidation_stage: StringNode({
					validator: 'resource',
					params: { pool: 'block' },
				}),
			}),
			change: (v: any) => ({
				next_oxidation_stage: v,
			}),
		},
	]), (values) => values['minecraft:grass_block'] = {
		next_oxidation_stage: 'minecraft:dirt',
	})
	createDataMap(schemas, collections, 'parrot_imitations', 'entity_type', ChoiceNode([
		{
			type: 'string',
			node: StringNode({
				validator: 'resource',
				params: { pool: 'sound_event' as any },
			}),
			change: (v: any) => v?.sound,
		},
		{
			type: 'object',
			node: ObjectNode({
				sound: StringNode({
					validator: 'resource',
					params: { pool: 'sound_event' as any },
				}),
			}),
			change: (v: any) => ({
				sound: v,
			}),
		},
	]), (values) => values['minecraft:allay'] = {
		sound: 'minecraft:entity.allay.ambient_without_item',
	})
	createDataMap(schemas, collections, 'raid_hero_gifts', 'villager_profession', ChoiceNode([
		{
			type: 'string',
			node: StringNode({
				validator: 'resource',
				params: { pool: '$loot_table' },
			}),
			change: (v: any) => v?.loot_table,
		},
		{
			type: 'object',
			node: ObjectNode({
				loot_table: StringNode({
					validator: 'resource',
					params: { pool: '$loot_table' },
				}),
			}),
			change: (v: any) => ({
				loot_table: v,
			}),
		},
	]), (values) => values['minecraft:cleric'] = {
		loot_table: 'minecraft:empty',
	})
	createDataMap(schemas, collections, 'vibration_frequencies', 'game_event', ChoiceNode([
		{
			type: 'number',
			node: NumberNode({
				min: 1,
				max: 15,
				integer: true,
			}),
			change: (v: any) => v?.frequency,
		},
		{
			type: 'object',
			node: ObjectNode({
				frequency: NumberNode({
					min: 1,
					max: 15,
					integer: true,
				}),
			}),
			change: (v: any) => ({
				frequency: v,
			}),
		},
	]), (values) => values['minecraft:block_change'] = {
		frequency: 5,
	})
	createDataMap(schemas, collections, 'waxables', 'block', ChoiceNode([
		{
			type: 'string',
			node: StringNode({
				validator: 'resource',
				params: { pool: 'block' },
			}),
			change: (v: any) => v?.waxed,
		},
		{
			type: 'object',
			node: ObjectNode({
				waxed: StringNode({
					validator: 'resource',
					params: { pool: 'block' },
				}),
			}),
			change: (v: any) => ({
				waxed: v,
			}),
		},
	]), (values) => values['minecraft:dirt'] = {
		waxed: 'minecraft:coarse_dirt',
	})
}

function createDataMap(schemas: SchemaRegistry, collections: CollectionRegistry, dataMap: string, registry: ResourceType, valueNode: INode<any>, def: (values: any) => void) {
	const StringNode = RawStringNode.bind(undefined, collections)
	
	// Ref or tag
	const Tag = StringNode({
		validator: 'resource',
		params: { pool: registry, allowTag: true },
	})
	
	// Create data map
	schemas.register(`${ID}:data_map_${dataMap}`, Mod(
		ObjectNode({
			replace: Opt(BooleanNode()),
			values: MapNode(
				Tag,
				ChoiceNode([
					{
						type: 'direct',
						match: () => true,
						node: valueNode,
						change: (v: any) => v?.value,
					},
					{
						type: 'replaceable',
						match: (v: any) => typeof v === 'object' && v?.value !== undefined,
						priority: 1,
						node: ObjectNode({
							replace: Opt(BooleanNode()),
							value: valueNode,
						}),
						change: (v: any) => ({
							replace: true,
							value: v,
						}),
					},
				]),
			),
			remove: Opt(ListNode(Tag)),
		}, {context: `${ID}.data_map_${dataMap}`, disableSwitchContext: true}),
		{
			default: () => {
				const result = {
					values: {},
				}
				def(result.values)

				return result
			},
		}
	))
}

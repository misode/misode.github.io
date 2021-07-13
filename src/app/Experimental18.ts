import type { CollectionRegistry, INode, SchemaRegistry } from '@mcschema/core'
import { BooleanNode, Case, ChoiceNode, ListNode, MapNode, Mod, NumberNode, ObjectNode, ObjectOrPreset, Opt, Reference as RawReference, StringNode as RawStringNode, Switch } from '@mcschema/core'
import * as java17 from '@mcschema/java-1.17'

export function getCollections() {
	return java17.getCollections()
}

export function getSchemas(collections: CollectionRegistry) {
	modifyCollection(collections, 'heightmap_type', ['WORLD_SURFACE_IGNORE_SNOW'], [])
	modifyCollection(collections, 'worldgen/surface_builder', ['grove', 'snowcapped_peaks', 'snowy_slopes', 'lofty_peaks'], [])
	modifyCollection(collections, 'worldgen/biome_source', [], ['vanilla_layered'])
	modifyCollection(collections, 'worldgen/biome', ['meadow', 'grove', 'snowy_slopes', 'snowcapped_peaks', 'lofty_peaks'], [])

	const schemas = java17.getSchemas(collections)
	initDimensionSchemas(schemas, collections)
	initBiomeSchemas(schemas, collections)
	return schemas
}

function modifyCollection(collections: CollectionRegistry, id: string, add: string[], remove: string[]) {
	const collection = collections.get(id)
	remove.forEach(id => {
		const i = collection.indexOf(`minecraft:${id}`)
		if (i >= 0) collection.splice(i, 1)
	})
	add.forEach(id => {
		collection.push(`minecraft:${id}`)
	})
	collections.register(id, collection)
}

function initDimensionSchemas(schemas: SchemaRegistry, collections: CollectionRegistry) {
	const Reference = RawReference.bind(undefined, schemas)
	const StringNode = RawStringNode.bind(undefined, collections)

	const DefaultDimensionType = {
		ultrawarm: false,
		natural: true,
		piglin_safe: false,
		respawn_anchor_works: false,
		bed_works: true,
		has_raids: true,
		has_skylight: true,
		has_ceiling: false,
		coordinate_scale: 1,
		ambient_light: 0,
		logical_height: 256,
		infiniburn: 'minecraft:infiniburn_overworld',
		min_y: 0,
		height: 256,
	}

	const DimensionTypePresets = (node: INode<any>) => ObjectOrPreset(
		StringNode({ validator: 'resource', params: { pool: '$dimension_type' } }),
		node,
		{
			'minecraft:overworld': DefaultDimensionType,
			'minecraft:the_nether': {
				name: 'minecraft:the_nether',
				ultrawarm: true,
				natural: false,
				shrunk: true,
				piglin_safe: true,
				respawn_anchor_works: true,
				bed_works: false,
				has_raids: false,
				has_skylight: false,
				has_ceiling: true,
				ambient_light: 0.1,
				fixed_time: 18000,
				logical_height: 128,
				effects: 'minecraft:the_nether',
				infiniburn: 'minecraft:infiniburn_nether',
				min_y: 0,
				height: 256,
			},
			'minecraft:the_end': {
				name: 'minecraft:the_end',
				ultrawarm: false,
				natural: false,
				shrunk: false,
				piglin_safe: false,
				respawn_anchor_works: false,
				bed_works: false,
				has_raids: true,
				has_skylight: false,
				has_ceiling: false,
				ambient_light: 0,
				fixed_time: 6000,
				logical_height: 256,
				effects: 'minecraft:the_end',
				infiniburn: 'minecraft:infiniburn_end',
				min_y: 0,
				height: 256,
			},
		}
	)

	const DefaultNoiseSettings = {
		name: 'minecraft:overworld',
		bedrock_roof_position: -10,
		bedrock_floor_position: 0,
		sea_level: 63,
		disable_mob_generation: false,
		noise_caves_enabled: true,
		aquifers_enabled: true,
		deepslate_enabled: true,
		noise: {
			min_y: 0,
			height: 256,
			density_factor: 1,
			density_offset: -0.46875,
			simplex_surface_noise: true,
			random_density_offset: true,
			size_horizontal: 1,
			size_vertical: 2,
			sampling: {
				xz_scale: 1,
				y_scale: 1,
				xz_factor: 80,
				y_factor: 160,
			},
			top_slide: {
				target: -10,
				size: 3,
				offset: 0,
			},
			bottom_slide: {
				target: -30,
				size: 0,
				offset: 0,
			},
		},
		default_block: {
			Name: 'minecraft:stone',
		},
		default_fluid: {
			Name: 'minecraft:water',
			Properties: {
				level: '0',
			},
		},
	}

	const NoiseSettingsPresets = (node: INode<any>) => ObjectOrPreset(
		StringNode({ validator: 'resource', params: { pool: '$worldgen/noise_settings' } }),
		node,
		{
			'minecraft:overworld': DefaultNoiseSettings,
			'minecraft:nether': {
				name: 'minecraft:nether',
				bedrock_roof_position: 0,
				bedrock_floor_position: 0,
				sea_level: 32,
				disable_mob_generation: true,
				noise_caves_enabled: false,
				aquifers_enabled: false,
				deepslate_enabled: false,
				noise: {
					min_y: 0,
					height: 128,
					density_factor: 0,
					density_offset: 0.019921875,
					simplex_surface_noise: false,
					random_density_offset: false,
					size_horizontal: 1,
					size_vertical: 2,
					sampling: {
						xz_scale: 1,
						y_scale: 3,
						xz_factor: 80,
						y_factor: 60,
					},
					top_slide: {
						target: 120,
						size: 3,
						offset: 0,
					},
					bottom_slide: {
						target: 320,
						size: 4,
						offset: -1,
					},
				},
				default_block: {
					Name: 'minecraft:netherrack',
				},
				default_fluid: {
					Name: 'minecraft:lava',
					Properties: {
						level: '0',
					},
				},
			},
			'minecraft:end': {
				name: 'minecraft:end',
				bedrock_roof_position: -10,
				bedrock_floor_position: -10,
				sea_level: 0,
				disable_mob_generation: true,
				noise_caves_enabled: false,
				aquifers_enabled: false,
				deepslate_enabled: false,
				noise: {
					min_y: 0,
					height: 128,
					density_factor: 0,
					density_offset: 0,
					simplex_surface_noise: true,
					random_density_offset: false,
					island_noise_override: true,
					size_horizontal: 2,
					size_vertical: 1,
					sampling: {
						xz_scale: 2,
						y_scale: 1,
						xz_factor: 80,
						y_factor: 160,
					},
					top_slide: {
						target: -3000,
						size: 64,
						offset: -46,
					},
					bottom_slide: {
						target: -30,
						size: 7,
						offset: 1,
					},
				},
				default_block: {
					Name: 'minecraft:end_stone',
				},
				default_fluid: {
					Name: 'minecraft:air',
				},
			},
			'minecraft:amplified': {
				name: 'minecraft:amplified',
				bedrock_roof_position: -10,
				bedrock_floor_position: 0,
				sea_level: 63,
				disable_mob_generation: false,
				noise_caves_enabled: true,
				aquifers_enabled: true,
				deepslate_enabled: true,
				noise: {
					min_y: 0,
					height: 256,
					density_factor: 1,
					density_offset: -0.46875,
					simplex_surface_noise: true,
					random_density_offset: true,
					amplified: true,
					size_horizontal: 1,
					size_vertical: 2,
					sampling: {
						xz_scale: 1,
						y_scale: 1,
						xz_factor: 80,
						y_factor: 160,
					},
					top_slide: {
						target: -10,
						size: 3,
						offset: 0,
					},
					bottom_slide: {
						target: -30,
						size: 0,
						offset: 0,
					},
				},
				default_block: {
					Name: 'minecraft:stone',
				},
				default_fluid: {
					Name: 'minecraft:water',
					Properties: {
						level: '0',
					},
				},
			},
			'minecraft:caves': {
				name: 'minecraft:caves',
				bedrock_roof_position: 0,
				bedrock_floor_position: 0,
				sea_level: 32,
				disable_mob_generation: true,
				noise_caves_enabled: false,
				aquifers_enabled: false,
				deepslate_enabled: false,
				noise: {
					min_y: 0,
					height: 128,
					density_factor: 0,
					density_offset: 0.019921875,
					simplex_surface_noise: false,
					random_density_offset: false,
					size_horizontal: 1,
					size_vertical: 2,
					sampling: {
						xz_scale: 1,
						y_scale: 3,
						xz_factor: 80,
						y_factor: 60,
					},
					top_slide: {
						target: 120,
						size: 3,
						offset: 0,
					},
					bottom_slide: {
						target: 320,
						size: 4,
						offset: -1,
					},
				},
				default_block: {
					Name: 'minecraft:stone',
				},
				default_fluid: {
					Name: 'minecraft:water',
					Properties: {
						level: '0',
					},
				},
			},
			'minecraft:floating_islands': {
				name: 'minecraft:floating_islands',
				bedrock_roof_position: -10,
				bedrock_floor_position: -10,
				sea_level: 0,
				disable_mob_generation: true,
				noise_caves_enabled: false,
				aquifers_enabled: false,
				deepslate_enabled: false,
				noise: {
					min_y: 0,
					height: 128,
					density_factor: 0,
					density_offset: 0,
					simplex_surface_noise: true,
					random_density_offset: false,
					island_noise_override: true,
					size_horizontal: 2,
					size_vertical: 1,
					sampling: {
						xz_scale: 2,
						y_scale: 1,
						xz_factor: 80,
						y_factor: 160,
					},
					top_slide: {
						target: -3000,
						size: 64,
						offset: -46,
					},
					bottom_slide: {
						target: -30,
						size: 7,
						offset: 1,
					},
				},
				default_block: {
					Name: 'minecraft:stone',
				},
				default_fluid: {
					Name: 'minecraft:water',
					Properties: {
						level: '0',
					},
				},
			},
		}
	)

	const NoPreset = (node: INode) => Mod(node, {
		enabled: path => path.push('preset').get() === undefined,
	})

	schemas.register('dimension', Mod(ObjectNode({
		type: DimensionTypePresets(Reference('dimension_type')),
		generator: ObjectNode({
			type: StringNode({ validator: 'resource', params: { pool: 'worldgen/chunk_generator' } }),
			[Switch]: [{ push: 'type' }],
			[Case]: {
				'minecraft:noise': {
					seed: NumberNode({ integer: true }),
					settings: NoiseSettingsPresets(Reference('noise_settings')),
					biome_source: ObjectNode({
						type: StringNode({ validator: 'resource', params: { pool: 'worldgen/biome_source' } }),
						[Switch]: [{ push: 'type' }],
						[Case]: {
							'minecraft:fixed': {
								biome: StringNode({ validator: 'resource', params: { pool: '$worldgen/biome' } }),
							},
							'minecraft:multi_noise': {
								seed: NumberNode({ integer: true }),
								preset: Opt(StringNode({ enum: ['overworld', 'nether'] })),
								temperature_noise: NoPreset(Reference('generator_biome_noise')),
								humidity_noise: NoPreset(Reference('generator_biome_noise')),
								continentalness_noise: NoPreset(Reference('generator_biome_noise')),
								weirdness_noise: NoPreset(Reference('generator_biome_noise')),
								erosion_noise: NoPreset(Reference('generator_biome_noise')),
								min_quart_y: NoPreset(NumberNode({ integer: true })),
								max_quart_y: NoPreset(NumberNode({ integer: true })),
								biomes: NoPreset(Mod(ListNode(
									Reference('generator_biome')
								), {
									default: () => [{
										biome: 'minecraft:plains',
									}],
								})),
							},
							'minecraft:checkerboard': {
								scale: Opt(NumberNode({ integer: true, min: 0, max: 62 })),
								biomes: ListNode(
									StringNode({ validator: 'resource', params: { pool: '$worldgen/biome' } })
								),
							},
							'minecraft:the_end': {
								seed: NumberNode({ integer: true }),
							},
						},
					}, { category: 'predicate', disableSwitchContext: true }),
				},
				'minecraft:flat': {
					settings: ObjectNode({
						biome: Opt(StringNode({ validator: 'resource', params: { pool: '$worldgen/biome' } })),
						lakes: Opt(BooleanNode()),
						features: Opt(BooleanNode()),
						layers: ListNode(
							Reference('generator_layer')
						),
						structures: Reference('generator_structures'),
					}),
				},
			},
		}, { disableSwitchContext: true }),
	}, { category: 'pool', context: 'dimension' }), {
		default: () => {
			const seed = Math.floor(Math.random() * (4294967296)) - 2147483648
			return {
				type: 'minecraft:overworld',
				generator: {
					type: 'minecraft:noise',
					seed,
					biome_source: {
						type: 'minecraft:fixed',
						seed,
						biome: 'minecraft:plains',
					},
					settings: 'minecraft:overworld',
				},
			}},
	}))

	const ClimateParameter = ChoiceNode([
		{
			type: 'number',
			node: NumberNode({ min: -2, max: 2 }),
			change: (v: any) => v[0] ?? 0,
		},
		{
			type: 'list',
			node: ListNode(
				NumberNode({ min: -2, max: 2 }),
				{ minLength: 2, maxLength: 2 },
			),
			change: (v: any) => [v ?? 0, v ?? 0],
		},
	])

	schemas.register('generator_biome', Mod(ObjectNode({
		biome: StringNode({ validator: 'resource', params: { pool: '$worldgen/biome' } }),
		parameters: ObjectNode({
			temperature: ClimateParameter,
			humidity: ClimateParameter,
			continentalness: ClimateParameter,
			erosion: ClimateParameter,
			depth: ClimateParameter,
			weirdness: ClimateParameter,
			offset: NumberNode({ min: 0, max: 1 }),
		}),
	}, { context: 'generator_biome' }), {
		default: () => ({
			biome: 'minecraft:plains',
		}),
	}))
}

export function initBiomeSchemas(schemas: SchemaRegistry, collections: CollectionRegistry) {
	const StringNode = RawStringNode.bind(undefined, collections)

	schemas.register('biome', Mod(ObjectNode({
		surface_builder: StringNode({ validator: 'resource', params: { pool: '$worldgen/configured_surface_builder' } }),
		temperature: NumberNode(),
		downfall: NumberNode(),
		precipitation: StringNode({ enum: ['none', 'rain', 'snow'] }),
		temperature_modifier: Opt(StringNode({ enum: ['none', 'frozen'] })),
		category: StringNode({ enum: 'biome_category' }),
		player_spawn_friendly: Opt(BooleanNode()),
		creature_spawn_probability: Opt(NumberNode({ min: 0, max: 1 })),
		effects: ObjectNode({
			sky_color: NumberNode({ color: true }),
			fog_color: NumberNode({ color: true }),
			water_color: NumberNode({ color: true }),
			water_fog_color: NumberNode({ color: true }),
			grass_color: Opt(NumberNode({ color: true })),
			foliage_color: Opt(NumberNode({ color: true })),
			grass_color_modifier: Opt(StringNode({ enum: ['none', 'dark_forest', 'swamp'] })),
			ambient_sound: Opt(StringNode()),
			mood_sound: Opt(ObjectNode({
				sound: StringNode(),
				tick_delay: NumberNode({ integer: true }),
				block_search_extent: NumberNode({ integer: true }),
				offset: NumberNode(),
			})),
			additions_sound: Opt(ObjectNode({
				sound: StringNode(),
				tick_chance: NumberNode({ min: 0, max: 1 }),
			})),
			music: Opt(ObjectNode({
				sound: StringNode(),
				min_delay: NumberNode({ integer: true, min: 0 }),
				max_delay: NumberNode({ integer: true, min: 0 }),
				replace_current_music: BooleanNode(),
			})),
			particle: Opt(ObjectNode({
				options: ObjectNode({
					type: StringNode(),
				}),
				probability: NumberNode({ min: 0, max: 1 }),
			})),
		}),
		starts: ListNode(
			StringNode({ validator: 'resource', params: { pool: '$worldgen/configured_structure_feature' } })
		),
		spawners: MapNode(
			StringNode({ enum: [
				'monster',
				'creature',
				'ambient',
				'underground_water_creature',
				'water_creature',
				'water_ambient',
				'misc',
			] }),
			Mod(ListNode(
				ObjectNode({
					type: StringNode({ validator: 'resource', params: { pool: 'entity_type' } }),
					weight: NumberNode({ integer: true }),
					minCount: NumberNode({ integer: true }),
					maxCount: NumberNode({ integer: true }),
				})
			), {
				category: () => 'pool',
				default: () => [{
					type: 'minecraft:bat',
					weight: 1,
				}],
			})
		),
		spawn_costs: MapNode(
			StringNode({ validator: 'resource', params: { pool: 'entity_type' } }),
			Mod(ObjectNode({
				energy_budget: NumberNode(),
				charge: NumberNode(),
			}, { category: 'function' }), {
				default: () => ({
					energy_budget: 0.12,
					charge: 1.0,
				}),
			})
		),
		carvers: MapNode(
			StringNode({ enum: ['air', 'liquid'] }),
			Mod(ListNode(
				StringNode({ validator: 'resource', params: { pool: '$worldgen/configured_carver' } })
			), {
				default: () => ['minecraft:cave'],
			})
		),
		features: ListNode(
			Mod(ListNode(
				StringNode({ validator: 'resource', params: { pool: '$worldgen/configured_feature' } })
			), { category: () => 'predicate' }),
			{ maxLength: 10 }
		),
	}, { context: 'biome' }), {
		default: () => ({
			surface_builder: 'minecraft:grass',
			temperature: 0.8,
			downfall: 0.4,
			precipitation: 'rain',
			category: 'plains',
			effects: {
				sky_color: 7907327,
				fog_color: 12638463,
				water_color: 4159204,
				water_fog_color: 329011,
			},
		}),
	}))
}

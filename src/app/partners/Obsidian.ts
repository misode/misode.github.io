import type { CollectionRegistry, SchemaRegistry } from '@mcschema/core'
import { BooleanNode, ListNode, MapNode, Mod, NumberNode, ObjectNode, Opt, Reference as RawReference, StringNode as RawStringNode } from '@mcschema/core'

const ID = 'obsidian'

export function initObsidian(schemas: SchemaRegistry, collections: CollectionRegistry) {
	const Reference = RawReference.bind(undefined, schemas)
	const StringNode = RawStringNode.bind(undefined, collections)

	// ITEMS
	schemas.register(`${ID}:item`, Mod(ObjectNode({
		information: Opt(Reference(`${ID}:item_information`)),
		display: Opt(ObjectNode({
			model: Opt(Reference(`${ID}:model`)),
			item_model: Opt(Reference(`${ID}:model`)),
			lore: ListNode(
				ObjectNode({
					text: Reference(`${ID}:name_information`),
				}),
			),
		})),
		use_action: Opt(ObjectNode({
			action: Opt(StringNode({ enum: ['none', 'eat', 'drink', 'block', 'bow', 'spear', 'crossbow', 'spyglass'] })),
			right_click_action: Opt(StringNode({ enum: ['open_gui', 'run_command', 'open_url']})) ,
			command: Opt(StringNode()),
			url: Opt(StringNode()),
			gui_size: Opt(NumberNode({ integer: true, min: 1, max: 6 })),
			gui_title: Opt(Reference(`${ID}:name_information`)),
		})),
	}, { context: `${ID}:item` }), {
		default: () => ({}),
	}))

	schemas.register(`${ID}:item_information`, ObjectNode({
		rarity: Opt(StringNode({ enum: ['common', 'uncommon', 'rare', 'epic']})),
		creative_tab: Opt(StringNode()),
		max_stack_size: Opt(NumberNode({ integer: true, min: 1 })),
		name: Opt(Reference(`${ID}:name_information`)),
		has_enchantment_glint: Opt(BooleanNode()),
		is_enchantable: Opt(BooleanNode()),
		enchantability: Opt(NumberNode({ integer: true })),
		use_duration: Opt(NumberNode({ integer: true })),
		can_place_block: Opt(BooleanNode()),
		placable_block: Opt(StringNode({ validator: 'resource', params: { pool: 'block' } })),
		wearable: Opt(BooleanNode()),
		default_color: Opt(NumberNode({ color: true })),
		wearable_slot: Opt(StringNode()),
		custom_render_mode: Opt(BooleanNode()),
		render_mode_models: Opt(ListNode(
			ObjectNode({
				model: Reference('model_identifier'),
				modes: ListNode(StringNode()),
			})
		)),
	}, { context: `${ID}:item_information` }))

	schemas.register(`${ID}:item_model`, ObjectNode({
		textures: Opt(MapNode(
			StringNode(),
			StringNode({ validator: 'resource', params: { pool: '$texture' } }),
		)),
		parent: StringNode({ validator: 'resource', params: { pool: '$model'} }),
	}, { context: `${ID}:item_model` }))

	schemas.register(`${ID}:block`, Mod(ObjectNode({
		block_type: Opt(StringNode({ enum: `${ID}:block_type`})),
		information: Opt(Reference(`${ID}:block_information`)),
		display: Opt(ObjectNode({
			model: Opt(Reference(`${ID}:model`)),
			item_model: Opt(Reference(`${ID}:model`)),
			block_model: Opt(Reference(`${ID}:model`)),
			lore: ListNode(
				ObjectNode({
					text: Reference(`${ID}:item_name_information`),
				}),
			),
		})),
		additional_information: Opt(ObjectNode({
			extraBlocksName: Opt(StringNode()),
			slab: Opt(BooleanNode()),
			stairs: Opt(BooleanNode()),
			walls: Opt(BooleanNode()),
			fence: Opt(BooleanNode()),
			fenceGate: Opt(BooleanNode()),
			button: Opt(BooleanNode()),
			pressurePlate: Opt(BooleanNode()),
			door: Opt(BooleanNode()),
			trapdoor: Opt(BooleanNode()),
			path: Opt(BooleanNode()),
			lantern: Opt(BooleanNode()),
			barrel: Opt(BooleanNode()),
			leaves: Opt(BooleanNode()),
			plant: Opt(BooleanNode()),
			chains: Opt(BooleanNode()),
			cake_like: Opt(BooleanNode()),
			waterloggable: Opt(BooleanNode()),
			dyable: Opt(BooleanNode()),
			defaultColor: Opt(NumberNode({ color: true })),
			sittable: Opt(BooleanNode()),
			isConvertible: Opt(BooleanNode()),
			convertible: Opt(ObjectNode({
				drops_item: Opt(BooleanNode()),
				reversible: Opt(BooleanNode()),
				parent_block: Opt(StringNode({ validator: 'resource', params: { pool: 'block' } })),
				transformed_block: Opt(StringNode({ validator: 'resource', params: { pool: 'block' } })),
				dropped_item: Opt(StringNode({ validator: 'resource', params: { pool: 'item' } })),
				sound: Opt(StringNode()),
				conversionItem: Opt(ObjectNode({
					item: StringNode({ validator: 'resource', params: { pool: 'item' } }),
					tag: StringNode({ validator: 'resource', params: { pool: '$tag/item' } }),
				})),
				reversalItem: Opt(ObjectNode({
					item: StringNode({ validator: 'resource', params: { pool: 'item' } }),
					tag: StringNode({ validator: 'resource', params: { pool: '$tag/item' } }),
				})),
			})),
		})),
		functions: Opt(ObjectNode({
			random_tick: Opt(StringNode({ validator: 'resource', params: { pool: '$function' } })),
			scheduled_tick: Opt(StringNode({ validator: 'resource', params: { pool: '$function' } })),
			on_use: Opt(StringNode({ validator: 'resource', params: { pool: '$function' } })),
			random_display_tick: Opt(StringNode({ validator: 'resource', params: { pool: '$function' } })),
		})),
		ore_information: Opt(ObjectNode({
			test_type: Opt(StringNode({ enum: ['tag', 'always', 'block_match', 'block_state_match', 'random_block_match', 'random_block_state_match']})),
			target_state: Opt(ObjectNode({
				block: Opt(StringNode({ validator: 'resource', params: { pool: 'block' }})),
				tag: Opt(StringNode({ validator: 'resource', params: { pool: '$tag/block' } })),
				properties: Opt(MapNode(
					StringNode(),
					StringNode(),
				)),
				probability: Opt(NumberNode({ min: 0, max: 1 })),
			})),
			triangleRange: Opt(BooleanNode()),
			plateau: Opt(NumberNode({ integer: true, min: 0 })),
			spawnPredicate: Opt(StringNode({ enum: ['built_in', 'vanilla', 'overworld', 'the_nether', 'the_end', 'categories', 'biomes'] })),
			biomeCategories: ListNode(StringNode()),
			biomes: ListNode(
				StringNode({ validator: 'resource', params: { pool: '$worldgen/biome' }})
			),
			size: Opt(NumberNode({ integer: true })),
			chance: Opt(NumberNode({ integer: true, min: 1 })),
			discardOnAirChance: Opt(NumberNode({ min: 0, max: 1 })),
			topOffset: Reference(`${ID}:block_y_offset`),
			bottomOffset: Reference(`${ID}:block_y_offset`),
		})),
		food_information: ObjectNode({

		}),
		campfire_properties: Opt(ObjectNode({
			emits_particles: Opt(BooleanNode()),
			fire_damage: Opt(NumberNode({ integer: true })),
			luminance: Opt(NumberNode({ integer: true })),
		})),
		can_plant_on: Opt(ListNode(
			StringNode({ validator: 'resource', params: { pool: 'block' } })
		)),
		particle_type: Opt(StringNode()),
		growable: Opt(ObjectNode({
			min_age: Opt(NumberNode({ integer: true })),
			max_age: Opt(NumberNode({ integer: true })),
		})),
		oxidizable_properties: Opt(ObjectNode({
			stages: Opt(ListNode(
				ObjectNode({
					can_be_waxed: Opt(BooleanNode()),
					stairs: Opt(BooleanNode()),
					slab: Opt(BooleanNode()),
					blocks: Opt(ListNode(
						ObjectNode({
							name: Opt(Reference(`${ID}:name_information`)),
							display: Opt(Reference(`${ID}:display_information`)),
						})
					)),
				})
			)),
		})),
		events: Opt(MapNode(
			StringNode(),
			Reference(`${ID}:block_property`)
		)),
		drop_information: Opt(ObjectNode({
			drops: Opt(ListNode(
				ObjectNode({
					name: StringNode({ validator: 'resource', params: { pool: 'item' } }),
					drops_if_silk_touch: Opt(BooleanNode()),
				})
			)),
			survives_explosion: Opt(BooleanNode()),
			xp_drop_amount: Opt(NumberNode({ integer: true })),
		})),
		is_multi_block: Opt(BooleanNode()),
		multiblock_information: Opt(ObjectNode({
			width: Opt(NumberNode({ integer: true })),
			height: Opt(NumberNode({ integer: true })),
		})),
		placable_feature: Opt(StringNode({ validator: 'resource', params: { pool: '$worldgen/configured_feature' } })),
	}, { context: `${ID}:block` }), {
		default: () => ({}),
	}))

	schemas.register(`${ID}:block_information`, ObjectNode({
		rarity: Opt(StringNode({ enum: ['common', 'uncommon', 'rare', 'epic']})),
		creative_tab: Opt(StringNode()),
		collidable: Opt(BooleanNode()),
		max_stack_size: Opt(NumberNode({ integer: true, min: 1 })),
		name: Opt(Reference(`${ID}:name_information`)),
		vanilla_sound_group: Opt(StringNode({ validator: 'resource', params: { pool: '$sound_event' } })),
		custom_sound_group: Opt(Reference(`${ID}:sound_group`)),
		vanilla_material: Opt(StringNode()),
		custom_material: Opt(Reference(`${ID}:material`)),
		vanilla_harvest_tool: Opt(StringNode({ validator: 'resource', params: { pool: '$tool' } })),
		has_glint: Opt(BooleanNode()),
		is_enchantable: Opt(BooleanNode()),
		enchantability: Opt(NumberNode({ integer: true })),
		fireproof: Opt(BooleanNode()),
		translucent: Opt(BooleanNode()),
		dynamic_boundaries: Opt(BooleanNode()),
		has_item: Opt(BooleanNode()),
		cake_slices: Opt(NumberNode({integer: true, min: 1})),
		wearable: Opt(BooleanNode()),
		defaultColor: Opt(NumberNode({ color: true })),
		wearableSlot: Opt(StringNode()),
		customRenderMode: Opt(BooleanNode()),
		renderModeModels: Opt(ListNode(
			ObjectNode({
				model: Reference('model_identifier'),
				modes: ListNode(StringNode()),
			})
		)),
	}, { context: `${ID}:block_information` }))

	schemas.register(`${ID}:model`, ObjectNode({
		textures: Opt(MapNode(
			StringNode(),
			StringNode({ validator: 'resource', params: { pool: '$texture' } }),
		)),
		parent: StringNode({ validator: 'resource', params: { pool: '$model'} }),
	}, { context: `${ID}:model` }))

	schemas.register(`${ID}:sound_group`, ObjectNode({
		id: Opt(StringNode()),
		break_sound: Opt(StringNode()),
		step_sound: Opt(StringNode()),
		place_sound: Opt(StringNode()),
		hit_sound: Opt(StringNode())
	}, { context: `${ID}:sound_group` }))

	schemas.register(`${ID}:material`, ObjectNode({
		id: Opt(StringNode()),
		map_color: Opt(StringNode()),
		allows_movement: Opt(BooleanNode()),
		burnable: Opt(BooleanNode()),
		liquid: Opt(BooleanNode()),
		allows_light: Opt(BooleanNode()),
		replacable: Opt(BooleanNode()),
		solid: Opt(BooleanNode()),
		piston_behaviour: Opt(StringNode({ enum: ['NORMAL', 'DESTROY', 'BLOCK', 'IGNORE', 'PUSH_ONLY'] })),
	}, { context: `${ID}:material` }))

	// COMMON
	schemas.register(`${ID}:name_information`, ObjectNode({
		id: StringNode(),
		text: Opt(StringNode()),
		type: Opt(StringNode({ enum: ['literal'] })),
		translated: Opt(MapNode(
			StringNode(),
			StringNode(),
		)),
		color: Opt(StringNode()),
		formatting: Opt(ListNode(
			StringNode(),
		)),
	}))

	schemas.register(`${ID}:display_information`, ObjectNode({
		// TODO
	}))

	schemas.register(`${ID}:block_property`, ObjectNode({
		// TODO
	}))


	// COLLECTIONS
	collections.register(`${ID}:block_type`, [
		'BLOCK',
		'HORIZONTAL_FACING_BLOCK',
		'ROTATABLE_BLOCK',
		'CAMPFIRE',
		'STAIRS',
		'SLAB',
		'WALL',
		'FENCE',
		'FENCE_GATE',
		'CAKE',
		'BED',
		'TRAPDOOR',
		'METAL_DOOR',
		'WOODEN_DOOR',
		'LOG',
		'STEM',
		'WOOD',
		'OXIDIZING_BLOCK',
		'PLANT',
		'PILLAR',
		'HORIZONTAL_FACING_PLANT',
		'SAPLING',
		'TORCH',
		'BEEHIVE',
		'LEAVES',
		'LADDER',
		'PATH',
		'WOODEN_BUTTON',
		'STONE_BUTTON',
		'DOUBLE_PLANT',
		'HORIZONTAL_FACING_DOUBLE_PLANT',
		'HANGING_DOUBLE_LEAVES',
		'EIGHT_DIRECTIONAL_BLOCK',
		'LANTERN',
		'CHAIN',
		'PANE',
		'DYEABLE',
		'LOOM',
		'GRINDSTONE',
		'CRAFTING_TABLE',
		'PISTON',
		'NOTEBLOCK',
		'JUKEBOX',
		'SMOKER',
		'FURNACE',
		'BLAST_FURNACE',
		'LECTERN',
		'FLETCHING_TABLE',
		'BARREL',
		'COMPOSTER',
		'RAILS',
		'CARTOGRAPHY_TABLE',
		'CARPET',
	])
}

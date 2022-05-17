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
			model: Opt(Reference(`${ID}:item_model`)),
			itemModel: Opt(Reference(`${ID}:item_model`)),
			lore: ListNode(
				ObjectNode({
					text: Reference(`${ID}:name_information`),
				}),
			),
		})),
		useAction: Opt(ObjectNode({
			action: StringNode({ enum: ['none', 'eat', 'drink', 'block', 'bow', 'spear', 'crossbow', 'spyglass'] }),
			rightClickAction: Opt(StringNode()),
			guiSize: Opt(NumberNode({ integer: true })),
			inventoryName: Opt(StringNode()),
		})),
	}, { context: `${ID}:item` }), {
		default: () => ({}),
	}))

	schemas.register(`${ID}:item_information`, ObjectNode({
		rarity: Opt(StringNode({ enum: ['common', 'uncommon', 'rare', 'epic']})),
		item_group: Opt(StringNode()),
		max_count: Opt(NumberNode({ integer: true, min: 1 })),
		name: Opt(Reference(`${ID}:name_information`)),
		has_glint: Opt(BooleanNode()),
		is_enchantable: Opt(BooleanNode()),
		enchantability: Opt(NumberNode({ integer: true })),
		use_duration: Opt(NumberNode({ integer: true })),
		can_place_block: Opt(BooleanNode()),
		placable_block: Opt(StringNode({ validator: 'resource', params: { pool: 'block' } })),
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
	}, { context: `${ID}:item_information` }))

	schemas.register(`${ID}:item_model`, ObjectNode({
		textures: Opt(MapNode(
			StringNode(),
			StringNode({ validator: 'resource', params: { pool: '$texture' } }),
		)),
		parent: StringNode({ validator: 'resource', params: { pool: '$model'} }),
	}, { context: `${ID}:item_model` }))


	// BLOCKS
	schemas.register(`${ID}:block`, ObjectNode({
		block_type: Opt(StringNode({ enum: `${ID}:block_type`})),
		information: Opt(Reference(`${ID}:block_information`)),
		display: Opt(Reference(`${ID}:display_information`)),
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
			random_tick: StringNode({ validator: 'resource', params: { pool: '$function' } }),
			scheduled_tick: StringNode({ validator: 'resource', params: { pool: '$function' } }),
			on_use: StringNode({ validator: 'resource', params: { pool: '$function' } }),
			random_display_tick: StringNode({ validator: 'resource', params: { pool: '$function' } }),
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
		dropInformation: Opt(ObjectNode({
			drops: Opt(ListNode(
				ObjectNode({
					name: StringNode({ validator: 'resource', params: { pool: 'item' } }),
					drops_if_silk_touch: Opt(BooleanNode()),
				})
			)),
			survives_explosion: Opt(BooleanNode()),
			xp_drop_amount: Opt(NumberNode({ integer: true })),
		})),
		isMultiBlock: Opt(BooleanNode()),
		multiBlockInformation: Opt(ObjectNode({
			width: Opt(NumberNode({ integer: true })),
			height: Opt(NumberNode({ integer: true })),
		})),
		treeFeature: Opt(StringNode()),
	}))

	schemas.register(`${ID}:block_y_offset`, ObjectNode({
		type: Opt(StringNode({enum: ['fixed', 'above_bottom', 'below_top', 'bottom', 'top']})),
		offset: Opt(NumberNode({ integer: true })),
	}))

	schemas.register(`${ID}:block_information`, ObjectNode({
		// TODO
	}))


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

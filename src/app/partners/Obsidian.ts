import type { CollectionRegistry, SchemaRegistry } from '@mcschema/core'
import { BooleanNode, ListNode, MapNode, Mod, NumberNode, ObjectNode, Opt, Reference as RawReference, StringNode as RawStringNode } from '@mcschema/core'

const ID = 'obsidian'

export function initObsidian(schemas: SchemaRegistry, collections: CollectionRegistry) {
	const Reference = RawReference.bind(undefined, schemas)
	const StringNode = RawStringNode.bind(undefined, collections)

	schemas.register(`${ID}:item`, Mod(ObjectNode({
		information: Opt(Reference(`${ID}:item_information`)),
		display: Opt(ObjectNode({
			model: Opt(Reference(`${ID}:item_model`)),
			itemModel: Opt(Reference(`${ID}:item_model`)),
			lore: ListNode(
				ObjectNode({
					text: Reference(`${ID}:item_name_information`),
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

	const SpecialText = {
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
	}

	schemas.register(`${ID}:item_information`, ObjectNode({
		rarity: Opt(StringNode({ enum: ['common', 'uncommon', 'rare', 'epic']})),
		item_group: Opt(StringNode()),
		max_count: Opt(NumberNode({ integer: true, min: 1 })),
		name: Opt(Reference(`${ID}:item_name_information`)),
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

	schemas.register(`${ID}:item_name_information`, ObjectNode({
		id: Opt(StringNode({ validator: 'resource', params: { pool: 'item' } })),
		...SpecialText,
	}, { context: `${ID}:item_name_information` }))

	schemas.register(`${ID}:item_model`, ObjectNode({
		textures: Opt(MapNode(
			StringNode(),
			StringNode({ validator: 'resource', params: { pool: '$texture' } }),
		)),
		parent: StringNode({ validator: 'resource', params: { pool: '$model'} }),
	}, { context: `${ID}:item_model` }))
}

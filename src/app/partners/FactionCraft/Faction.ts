import type { CollectionRegistry, SchemaRegistry } from '@mcschema/core'
import { BooleanNode, ListNode, NumberNode, ObjectNode, Opt, Reference as RawReference, StringNode as RawStringNode } from '@mcschema/core'

const ID = 'faction_craft'

export function initFaction(schemas: SchemaRegistry, collections: CollectionRegistry) {
	const Reference = RawReference.bind(undefined, schemas)
	const StringNode = RawStringNode.bind(undefined, collections)

	schemas.register(`${ID}:faction`, ObjectNode({
		name: StringNode({ validator: 'resource', params: { pool: [] }  }),
		replace: Opt(BooleanNode()),
		banner: Opt(Reference(`${ID}:banner_itemstack`)),
		relations: Opt(Reference(`${ID}:faction_relations`)),
		raid_config: Opt(Reference(`${ID}:faction_raid_config`)),
		boosts: Opt(Reference(`${ID}:faction_boost_config`)),
		entities: ListNode(Reference(`${ID}:faction_entity_type`)),
		activation_advancement: Opt(StringNode({ validator: 'resource', params: { pool: [] }  })),
	}, { context: `${ID}.faction` }))

	schemas.register(`${ID}:faction_relations`, ObjectNode({
		allies: ListNode(StringNode({ validator: 'resource', params: { pool: [] }  })),
		enemies: ListNode(StringNode({ validator: 'resource', params: { pool: [] }}))
	}, { context: `${ID}.faction_relations` }))

	schemas.register(`${ID}:faction_raid_config`, ObjectNode({
	    name_alt: Opt(StringNode()),
        victory_alt: Opt(StringNode()),
        defeat_alt: Opt(StringNode()),
        mobs_fraction: Opt(NumberNode({ integer: false, min: 0, max: 1 })),
        wave_sound: Opt(StringNode({ validator: 'resource', params: { pool: [] } })),
        victory_sound: Opt(StringNode({ validator: 'resource', params: { pool: [] } })),
        defeat_sound: Opt(StringNode({ validator: 'resource', params: { pool: [] } }))
	}, { context: `${ID}.faction_raid_config` }))

	schemas.register(`${ID}:faction_boost_config`, ObjectNode({
		distribution: StringNode({ enum: ["random","uniform_all", "uniform_type"]  }),
		mandatory: ListNode(StringNode({ validator: 'resource', params: { pool: `${ID}:boosts` as any } })),
		whitelist: ListNode(StringNode({ validator: 'resource', params: { pool: `${ID}:boosts` as any } })),
		blacklist: ListNode(StringNode({ validator: 'resource', params: { pool: `${ID}:boosts` as any } })),
		rarity_overrides: ListNode(Reference(`${ID}:boost_rarity_override`))
	}, { context: `${ID}.faction_boost_config` }))

	schemas.register(`${ID}:faction_entity_type`, ObjectNode({
		entity_type: StringNode({ validator: 'resource', params: { pool: "entity_type" } }),
		tag: Opt(StringNode()),
		rank: StringNode({ enum: ["soldier","captain", "general", "support", "leader", "mount"]  }),
		maximum_rank: StringNode({ enum: ["soldier","captain", "general", "support", "leader", "mount"]  }), weight: NumberNode({ integer: true, min: 1  }),
		strength: NumberNode({ integer: true, min: 1  }),
		boosts: Opt(Reference(`${ID}:entity_type_boost_config`)),
		minimum_wave: NumberNode({ min: 1, max: 99999 })
		maximum_wave: Opt(NumberNode({ min: 1, max: 99999 }))
		min_per_wave: Opt(NumberNode({ min: 0, max: 99999 }))
		max_per_wave: Opt(NumberNode({ min: 1, max: 99999 }))
	}, { context: `${ID}.faction_entity_type` }))

	schemas.register(`${ID}:entity_type_boost_config`, ObjectNode({
		mandatory: ListNode(StringNode({ validator: 'resource', params: { pool: `${ID}:boosts` as any } })),
		whitelist: ListNode(StringNode({ validator: 'resource', params: { pool: `${ID}:boosts` as any } })),
		blacklist: ListNode(StringNode({ validator: 'resource', params: { pool: `${ID}:boosts` as any } })),
		rarity_overrides: ListNode(Reference(`${ID}:boost_rarity_override`))
	}, { context: `${ID}.entity_type_boost_config` }))

	schemas.register(`${ID}:boost_rarity_override`, ObjectNode({
		boost: StringNode({ validator: 'resource', params: { pool: `${ID}:boosts` as any } }),
		rarity: StringNode({ enum: ["super_common", "common", "uncommon", "rare", "very_rare", "none"]  })
	}, { context: `${ID}.boost_rarity_override` }))

	schemas.register(`${ID}:banner_itemstack`, ObjectNode({
		id: StringNode({ validator: 'resource', params: { pool: `${ID}:banners` as any } }),
		count: NumberNode({ integer: true, min: 1, max: 1 }),
		tag: Reference(`${ID}:banner_tag`)
	}, { context: `${ID}.banner_itemstack` }))

	schemas.register(`${ID}:banner_tag`, ObjectNode({
		HideFlags: NumberNode({ integer: true, min: 32, max: 32 }),
		BlockEntityTag: Reference(`${ID}:banner_block_entity_tag`),
		display: Reference(`${ID}:banner_display`)
	}, { context: `${ID}.banner_tag` }))

	schemas.register(`${ID}:banner_block_entity_tag`, ObjectNode({
		Patterns: ListNode(Reference(`${ID}:banner_pattern`))
	}, { context: `${ID}.banner_block_entity_tag` }))

	schemas.register(`${ID}:banner_pattern`, ObjectNode({
		color: NumberNode({ integer: true, min: 0, max: 15 }),
		Pattern: StringNode({ enum: ["b",
                                            "bl",
                                            "br",
                                            "tl",
                                            "tr",
                                            "bs",
                                            "ts",
                                            "ls",
                                            "rs",
                                            "cs",
                                            "ms",
                                            "drs",
                                            "dls",
                                            "ss",
                                            "cr",
                                            "sc",
                                            "bt",
                                            "tt",
                                            "bts",
                                            "tts",
                                            "ld",
                                            "rd",
                                            "lud",
                                            "rud",
                                            "mc",
                                            "mr",
                                            "vh",
                                            "hh",
                                            "vhr",
                                            "hhb",
                                            "bo",
                                            "cbo",
                                            "gra",
                                            "gru",
                                            "bri",
                                            "glb",
                                            "cre",
                                            "sku",
                                            "flo",
                                            "moj",
                                            "pig"
                                        ] })
	}, { context: `${ID}.banner_pattern` }))

	schemas.register(`${ID}:banner_display`, ObjectNode({
		color: NumberNode({ color: true }),
		translate: StringNode()
	}, { context: `${ID}.banner_display` }))

	collections.register(`${ID}:banners`, [
        'minecraft:black_banner',
        'minecraft:blue_banner',
        'minecraft:brown_banner',
        'minecraft:cyan_banner',
        'minecraft:gray_banner',
        'minecraft:green_banner',
        'minecraft:light_blue_banner',
        'minecraft:light_gray_banner',
        'minecraft:lime_banner',
        'minecraft:magenta_banner',
        'minecraft:orange_banner',
        'minecraft:pink_banner',
        'minecraft:purple_banner',
        'minecraft:red_banner',
        'minecraft:white_banner',
        'minecraft:yellow_banner'
	])

	collections.register(`${ID}:boosts`, [
	    "minecraft:generic.armor",
        "minecraft:generic.armor_toughness",
        "minecraft:generic.attack_damage",
        "minecraft:generic.attack_knockback",
        "minecraft:generic.attack_speed",
        "minecraft:generic.flying_speed",
        "minecraft:generic.knockback_resistance",
        "minecraft:generic.max_health",
        "minecraft:generic.movement_speed",
        "minecraft:diamond_axe",
        "minecraft:diamond_sword",
        "minecraft:iron_axe",
        "minecraft:iron_sword",
        "minecraft:chicken",
        "minecraft:horse",
        "minecraft:skeleton_horse",
        "minecraft:spider",
        "minecraft:zombie_horse",
        "minecraft:leather_daylight_protection",
        "minecraft:melee_attack",
        "faction_craft:faction_ravager",
        "faction_craft:faction_spider"
    ])

}

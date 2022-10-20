import type { Random } from 'deepslate'
import { LegacyRandom } from 'deepslate'
import type { VersionId } from '../services/Schemas.js'
import { clamp, deepClone, getWeightedRandom, isObject } from '../Utils.js'

export interface Item {
	id: string,
	count: number,
	tag?: any,
}

export interface SlottedItem {
	slot: number,
	item: Item,
}

type ItemConsumer = (item: Item) => void

const StackMixers = {
	container: fillContainer,
	default: assignSlots,
}

type StackMixer = keyof typeof StackMixers

interface LootOptions {
	version: VersionId,
	seed: bigint,
	luck: number,
	daytime: number,
	weather: string,
	stackMixer: StackMixer,
}

interface LootContext extends LootOptions {
	random: Random,
	luck: number
	weather: string,
	dayTime: number,
	getItemTag(id: string): string[],
	getLootTable(id: string): any,
	getPredicate(id: string): any,
}

export function generateLootTable(lootTable: any, options: LootOptions) {
	const ctx = createLootContext(options)
	const result: Item[] = []
	generateTable(lootTable, item => result.push(item), ctx)
	console.log('...', result)
	const mixer = StackMixers[options.stackMixer]
	return mixer(result, ctx)
}

const SLOT_COUNT = 27

function fillContainer(items: Item[], ctx: LootContext): SlottedItem[] {
	const slots = shuffle([...Array(SLOT_COUNT)].map((_, i) => i), ctx)
	
	const queue = items.filter(i => i.id !== 'minecraft:air' && i.count > 1)
	items = items.filter(i => i.id !== 'minecraft:air' && i.count === 1)

	while (SLOT_COUNT - items.length - queue.length > 0 && queue.length > 0) { 
		const [itemA] = queue.splice(ctx.random.nextInt(queue.length), 1)
		const splitCount = ctx.random.nextInt(Math.floor(itemA.count / 2)) + 1
		const itemB = splitItem(itemA, splitCount)

		for (const item of [itemA, itemB]) {
			if (item.count > 1 && ctx.random.nextFloat() < 0.5) {
				queue.push(item)
			} else {
				items.push(item)
			}
		}
	}

	items.push(...queue)
	shuffle(items, ctx)

	const results: SlottedItem[] = []
	for (const item of items) {
		const slot = slots.pop()
		if (slot === undefined) {
			break
		}
		if (item.id !== 'minecraft:air' && item.count > 0) {
			results.push({ slot, item })
		}
	}
	return results
}

function assignSlots(items: Item[]): SlottedItem[] {
	return items.map((item, i) => ({ slot: i, item }))
}

function splitItem(item: Item, count: number): Item {
	const splitCount = Math.min(count, item.count)
	const other = deepClone(item)
	other.count = splitCount
	item.count = item.count - splitCount
	return other
}

function shuffle<T>(array: T[], ctx: LootContext) {
	let i = array.length
	while (i > 0) {
		const j = ctx.random.nextInt(i)
		i -= 1;
		[array[i], array[j]] = [array[j], array[i]]
	}
	return array
}

function generateTable(table: any, consumer: ItemConsumer, ctx: LootContext) {
	const tableConsumer = decorateFunctions(table.functions ?? [], consumer, ctx)
	for (const pool of table.pools ?? []) {
		generatePool(pool, tableConsumer, ctx)
	}
}

function createLootContext(options: LootOptions): LootContext {
	return {
		...options,
		random: new LegacyRandom(options.seed),
		luck: options.luck,
		weather: options.weather,
		dayTime: options.daytime,
		getItemTag: () => [],
		getLootTable: () => ({ pools: [] }),
		getPredicate: () => [],
	}
}

function generatePool(pool: any, consumer: ItemConsumer, ctx: LootContext) {
	if (composeConditions(pool.conditions ?? [])(ctx)) {
		const poolConsumer = decorateFunctions(pool.functions ?? [], consumer, ctx)

		const rolls = computeInt(pool.rolls, ctx) + Math.floor(computeFloat(pool.bonus_rolls, ctx) * ctx.luck)
		for (let i = 0; i < rolls; i += 1) {
			let totalWeight = 0
			const entries: any[] = []

			// Expand entries
			for (const entry of pool.entries ?? []) {
				expandEntry(entry, ctx, (e) => {
					const weight = computeWeight(e, ctx.luck)
					if (weight > 0) {
						entries.push(e)
						totalWeight += weight
					}
				})
			}

			// Select random entry
			if (totalWeight === 0 || entries.length === 0) {
				continue
			}
			if (entries.length === 1) {
				createItem(entries[0], poolConsumer, ctx)
				continue
			}
			let remainingWeight = ctx.random.nextInt(totalWeight)
			for (const entry of entries) {
				remainingWeight -= computeWeight(entry, ctx.luck)
				if (remainingWeight < 0) {
					createItem(entry, poolConsumer, ctx)
					break
				}
			}
		}
	}
}

function expandEntry(entry: any, ctx: LootContext, consumer: (entry: any) => void): boolean {
	if (!canEntryRun(entry, ctx)) {
		return false
	}
	const type = entry.type?.replace(/^minecraft:/, '')
	switch (type) {
		case 'group':
			for (const child of entry.children ?? []) {
				expandEntry(child, ctx, consumer)
			}
			return true
		case 'alternatives':
			for (const child of entry.children ?? []) {
				if (expandEntry(child, ctx, consumer)) {
					return true
				}
			}
			return false
		case 'sequence':
			for (const child of entry.children ?? []) {
				if (!expandEntry(child, ctx, consumer)) {
					return false
				}
			}
			return true
		case 'tag':
			if (entry.expand) {
				ctx.getItemTag(entry.tag ?? '').forEach(tagEntry => {
					consumer({ type: 'item', name: tagEntry })
				})
			} else {
				consumer(entry)
			}
			return true
		default:
			consumer(entry)
			return true
	}
}

function canEntryRun(entry: any, ctx: LootContext): boolean {
	return composeConditions(entry.conditions ?? [])(ctx)
}

function createItem(entry: any, consumer: ItemConsumer, ctx: LootContext) {
	const entryConsumer = decorateFunctions(entry.functions ?? [], consumer, ctx)

	const type = entry.type?.replace(/^minecraft:/, '')
	switch (type) {
		case 'item':
			entryConsumer({ id: entry.name, count: 1 })
			break
		case 'tag':
			ctx.getItemTag(entry.name ?? '').forEach(tagEntry => {
				entryConsumer({ id: tagEntry, count: 1 })
			})
			break
		case 'loot_table':
			generateTable(ctx.getLootTable(entry.name), entryConsumer, ctx)
			break
		case 'dynamic':
			// not relevant for this simulation
			break
	}
}

function computeWeight(entry: any, luck: number) {
	return Math.max(Math.floor((entry.weight ?? 1) + (entry.quality ?? 0) * luck), 0)
}

type LootFunction = (item: Item, ctx: LootContext) => void

function decorateFunctions(functions: any[], consumer: ItemConsumer, ctx: LootContext): ItemConsumer {
	const compositeFunction = composeFunctions(functions)
	return (item) => {
		compositeFunction(item, ctx)
		consumer(item)
	}
}

function composeFunctions(functions: any[]): LootFunction {
	return (item, ctx) => {
		for (const fn of functions) {
			if (composeConditions(fn.conditions ?? [])(ctx)) {
				const type = fn.function?.replace(/^minecraft:/, '');
				(LootFunctions[type]?.(fn) ?? (i => i))(item, ctx)
			}
		}
	}
}

const LootFunctions: Record<string, (params: any) => LootFunction> = {
	enchant_randomly: ({ enchantments }) => (item, ctx) => {
		const isBook = item.id === 'minecraft:book'
		if (enchantments === undefined || enchantments.length === 0) {
			enchantments = [...Enchantments.keys()]
				.filter(e => {
					const data = getEnchantmentData(e)
					return data.discoverable && (isBook || data.canEnchant(item.id))
				})
		}
		if (enchantments.length > 0) {
			const id = enchantments[ctx.random.nextInt(enchantments.length)]
			const data = getEnchantmentData(id)
			const lvl = ctx.random.nextInt(data.maxLevel - data.minLevel + 1) + data.minLevel
			if (isBook) {
				item.tag = {}
				item.count = 1
			}
			enchantItem(item, { id, lvl })
			if (isBook) {
				item.id = 'minecraft:enchanted_book'
			}
		}
	},
	enchant_with_levels: ({ levels, treasure }) => (item, ctx) => {
		const enchants = selectEnchantments(ctx.random, item, computeInt(levels, ctx), treasure)
		const isBook = item.id === 'minecraft:book'
		if (isBook) {
			item.count = 1
			item.tag = {}
		}
		for (const enchant of enchants) {
			enchantItem(item, enchant)
		}
		if (isBook) {
			item.id = 'minecraft:enchanted_book'
		}
	},
	limit_count: ({ limit }) => (item, ctx) => {
		const { min, max } = prepareIntRange(limit, ctx)
		item.count = clamp(item.count, min, max )
	},
	set_count: ({ count, add }) => (item, ctx) => {
		const oldCount = add ? (item.count) : 0
		item.count = clamp(oldCount + computeInt(count, ctx), 0, 64)
	},
	set_damage: ({ damage, add }) => (item, ctx) => {
		const maxDamage = MaxDamageItems.get(item.id)
		if (maxDamage) {
			const oldDamage = add ? 1 - (item.tag?.Damage ?? 0) / maxDamage : 0
			const newDamage = 1 - clamp(computeFloat(damage, ctx) + oldDamage, 0, 1)
			const finalDamage = Math.floor(newDamage * maxDamage)
			item.tag = { ...item.tag, Damage: finalDamage }
		}
	},
	set_enchantments: ({ enchantments, add }) => (item, ctx) => {
		Object.entries(enchantments).forEach(([id, level]) => {
			const lvl = computeInt(level, ctx)
			enchantItem(item, { id, lvl }, add)
		})
	},
	set_lore: ({ lore, replace }) => (item) => {
		const lines = lore.map((line: any) => JSON.stringify(line))
		const newLore = replace ? lines : [...(item.tag?.display?.Lore ?? []), ...lines]
		item.tag = { ...item.tag, display: { ...item.tag?.display, Lore: newLore } }
	},
	set_name: ({ name }) => (item) => {
		const newName = JSON.stringify(name)
		item.tag = { ...item.tag, display: { ...item.tag?.display, Name: newName } }
	},
}

type LootCondition = (ctx: LootContext) => boolean

function composeConditions(conditions: any[]): LootCondition {
	return (ctx) => {
		for (const cond of conditions) {
			if (!testCondition(cond, ctx)) {
				return false
			}
		}
		return true
	}
}

function testCondition(condition: any, ctx: LootContext): boolean {
	const type = condition.condition?.replace(/^minecraft:/, '')
	return (LootConditions[type]?.(condition) ?? (() => true))(ctx)
}

const LootConditions: Record<string, (params: any) => LootCondition> = {
	alternative: ({ terms }) => (ctx) => {
		for (const term of terms) {
			if (testCondition(term, ctx)) {
				return true
			}
		}
		return false
	},
	block_state_property: () => () => {
		return false // TODO
	},
	damage_source_properties: ({ predicate }) => (ctx) => {
		return testDamageSourcePredicate(predicate, ctx)
	},
	entity_properties: ({ predicate }) => (ctx) => {
		return testEntityPredicate(predicate, ctx)
	},
	entity_scores: () => () => {
		return false // TODO,
	},
	inverted: ({ term }) => (ctx) => {
		return !testCondition(term, ctx)
	},
	killed_by_player: ({ inverted }) => () => {
		return (inverted ?? false) === false // TODO
	},
	location_check: ({ predicate }) => (ctx) => {
		return testLocationPredicate(predicate, ctx)
	},
	match_tool: ({ predicate }) => (ctx) => {
		return testItemPredicate(predicate, ctx)
	},
	random_chance: ({ chance }) => (ctx) => {
		return ctx.random.nextFloat() < chance
	},
	random_chance_with_looting: ({ chance, looting_multiplier }) => (ctx) => {
		const level = 0 // TODO: get looting level from killer
		const probability = chance + level * looting_multiplier
		return ctx.random.nextFloat() < probability

	},
	reference: ({ name }) => (ctx) => {
		const predicate = ctx.getPredicate(name) ?? []
		if (Array.isArray(predicate)) {
			return composeConditions(predicate)(ctx)
		}
		return testCondition(predicate, ctx)
	},
	survives_explosion: () => () => true,
	table_bonus: ({ chances }) => (ctx) => {
		const level = 0 // TODO: get enchantment level from tool
		const chance = chances[clamp(level, 0, chances.length - 1)]
		return ctx.random.nextFloat() < chance
	},
	time_check: ({ value, period }) => (ctx) => {
		let time = ctx.dayTime
		if (period !== undefined) {
			time = time % period
		}
		const { min, max } = prepareIntRange(value, ctx)
		return min <= time && time <= max
	},
	value_check: () => () => {
		return false // TODO
	},
	weather_check: ({ raining, thundering }) => (ctx) => {
		const isRaining = ctx.weather === 'rain' || ctx.weather === 'thunder'
		const isThundering = ctx.weather === 'thunder'
		if (raining !== undefined && raining !== isRaining) return false
		if (thundering !== undefined && thundering !== isThundering) return false
		return true
	},
}

function computeInt(provider: any, ctx: LootContext): number {
	if (typeof provider === 'number') return provider
	if (!isObject(provider)) return 0

	const type = provider.type?.replace(/^minecraft:/, '') ?? 'uniform'
	switch (type) {
		case 'constant':
			return Math.round(provider.value ?? 0)
		case 'uniform':
			const min = computeInt(provider.min, ctx)
			const max = computeInt(provider.max, ctx)
			return max < min ? min : ctx.random.nextInt(max - min + 1) + min
		case 'binomial':
			const n = computeInt(provider.n, ctx)
			const p = computeFloat(provider.p, ctx)
			let result = 0
			for (let i = 0; i < n; i += 1) {
				if (ctx.random.nextFloat() < p) {
					result += 1
				}
			}
			return result 
	}
	return 0
}

function computeFloat(provider: any, ctx: LootContext): number {
	if (typeof provider === 'number') return provider
	if (!isObject(provider)) return 0

	const type = provider.type?.replace(/^minecraft:/, '') ?? 'uniform'
	switch (type) {
		case 'constant':
			return provider.value ?? 0
		case 'uniform':
			const min = computeFloat(provider.min, ctx)
			const max = computeFloat(provider.max, ctx)
			return max < min ? min : ctx.random.nextFloat() * (max-min) + min
		case 'binomial':
			const n = computeInt(provider.n, ctx)
			const p = computeFloat(provider.p, ctx)
			let result = 0
			for (let i = 0; i < n; i += 1) {
				if (ctx.random.nextFloat() < p) {
					result += 1
				}
			}
			return result 
	}
	return 0
}

function prepareIntRange(range: any, ctx: LootContext) {
	if (typeof range === 'number') {
		range = { min: range, max: range }
	}
	const min = computeInt(range.min, ctx)
	const max = computeInt(range.max, ctx)
	return { min, max }
}

function testItemPredicate(_predicate: any, _ctx: LootContext) {
	return false // TODO
}

function testLocationPredicate(_predicate: any, _ctx: LootContext) {
	return false // TODO
}

function testEntityPredicate(_predicate: any, _ctx: LootContext) {
	return false // TODO
}

function testDamageSourcePredicate(_predicate: any, _ctx: LootContext) {
	return false // TODO
}

function enchantItem(item: Item, enchant: Enchant, additive?: boolean) {
	if (!item.tag) {
		item.tag = {}
	}
	const listKey = (item.id === 'minecraft:book') ? 'StoredEnchantments' : 'Enchantments'
	if (!item.tag[listKey] || !Array.isArray(item.tag[listKey])) {
		item.tag[listKey] = []
	}
	const enchantments = item.tag[listKey] as any[]
	let index = enchantments.findIndex((e: any) => e.id === enchant.id)
	if (index !== -1) {
		const oldEnch = enchantments[index]
		oldEnch.lvl = Math.max(additive ? oldEnch.lvl + enchant.lvl : enchant.lvl, 0)
	} else {
		enchantments.push(enchant)
		index = enchantments.length - 1
	}
	if (enchantments[index].lvl === 0) {
		enchantments.splice(index, 1)
	}
}

function selectEnchantments(random: Random, item: Item, levels: number, treasure: boolean): Enchant[] {
	const enchantmentValue = EnchantmentItems.get(item.id) ?? 0
	if (enchantmentValue <= 0) {
		return []
	}
	levels += 1 + random.nextInt(Math.floor(enchantmentValue / 4 + 1)) + random.nextInt(Math.floor(enchantmentValue / 4 + 1))
	const f = (random.nextFloat() + random.nextFloat() - 1) * 0.15
	levels = clamp(Math.round(levels + levels * f), 1, Number.MAX_SAFE_INTEGER)
	let available = getAvailableEnchantments(item, levels, treasure)
	if (available.length === 0) {
		return []
	}
	const result = []
	const first = getWeightedRandom(random, available, getEnchantWeight)
	if (first) result.push(first)

	while (random.nextInt(50) <= levels) {
		if (result.length > 0) {
			const lastAdded = result[result.length - 1]
			available = available.filter(a => isEnchantCompatible(a.id, lastAdded.id))
		}
		if (available.length === 0) break
		const ench = getWeightedRandom(random, available, getEnchantWeight)
		if (ench) result.push(ench)
		levels = Math.floor(levels / 2)
	}

	return result
}

function getEnchantWeight(ench: Enchant) {
	return EnchantmentsRarityWeights.get(getEnchantmentData(ench.id)?.rarity ?? 'common') ?? 0
}

function getAvailableEnchantments(item: Item, levels: number, treasure: boolean): Enchant[] {
	const result = []
	const isBook = item.id === 'minecraft:book'

	for (const id of Enchantments.keys()) {
		const ench = getEnchantmentData(id)!
		if ((!ench.treasure || treasure) && ench.discoverable && (ench.canEnchant(item.id) || isBook)) {
			for (let lvl = ench.maxLevel; lvl > ench.minLevel - 1; lvl -= 1) {
				if (levels >= ench.minCost(lvl) && levels <= ench.maxCost(lvl)) {
					result.push({ id, lvl })
				}
			}
		}
	}
	return result
}

interface Enchant {
	id: string,
	lvl: number,
}

function isEnchantCompatible(a: string, b: string) {
	return a !== b && isEnchantCompatibleRaw(a, b) && isEnchantCompatibleRaw(b, a)
}

function isEnchantCompatibleRaw(a: string, b: string) {
	const ench = getEnchantmentData(a)
	return ench?.isCompatible(b)
}

export const MaxDamageItems = new Map(Object.entries<number>({
	'minecraft:carrot_on_a_stick': 25,
	'minecraft:warped_fungus_on_a_stick': 100,
	'minecraft:flint_and_steel': 64,
	'minecraft:elytra': 432,
	'minecraft:bow': 384,
	'minecraft:fishing_rod': 64,
	'minecraft:shears': 238,
	'minecraft:shield': 336,
	'minecraft:trident': 250,
	'minecraft:crossbow': 465,

	'minecraft:leather_helmet': 11 * 5,
	'minecraft:leather_chestplate': 16 * 5,
	'minecraft:leather_leggings': 15 * 5,
	'minecraft:leather_boots': 13 * 5,
	'minecraft:chainmail_helmet': 11 * 15,
	'minecraft:chainmail_chestplate': 16 * 15,
	'minecraft:chainmail_leggings': 15 * 15,
	'minecraft:chainmail_boots': 13 * 15,
	'minecraft:iron_helmet': 11 * 15,
	'minecraft:iron_chestplate': 16 * 15,
	'minecraft:iron_leggings': 15 * 15,
	'minecraft:iron_boots': 13 * 15,
	'minecraft:diamond_helmet': 11 * 33,
	'minecraft:diamond_chestplate': 16 * 33,
	'minecraft:diamond_leggings': 15 * 33,
	'minecraft:diamond_boots': 13 * 33,
	'minecraft:golden_helmet': 11 * 7,
	'minecraft:golden_chestplate': 16 * 7,
	'minecraft:golden_leggings': 15 * 7,
	'minecraft:golden_boots': 13 * 7,
	'minecraft:netherite_helmet': 11 * 37,
	'minecraft:netherite_chestplate': 16 * 37,
	'minecraft:netherite_leggings': 15 * 37,
	'minecraft:netherite_boots': 13 * 37,
	'minecraft:turtle_helmet': 11 * 25,

	'minecraft:wooden_sword': 59,
	'minecraft:wooden_shovel': 59,
	'minecraft:wooden_pickaxe': 59,
	'minecraft:wooden_axe': 59,
	'minecraft:wooden_hoe': 59,
	'minecraft:stone_sword': 131,
	'minecraft:stone_shovel': 131,
	'minecraft:stone_pickaxe': 131,
	'minecraft:stone_axe': 131,
	'minecraft:stone_hoe': 131,
	'minecraft:iron_sword': 250,
	'minecraft:iron_shovel': 250,
	'minecraft:iron_pickaxe': 250,
	'minecraft:iron_axe': 250,
	'minecraft:iron_hoe': 250,
	'minecraft:diamond_sword': 1561,
	'minecraft:diamond_shovel': 1561,
	'minecraft:diamond_pickaxe': 1561,
	'minecraft:diamond_axe': 1561,
	'minecraft:diamond_hoe': 1561,
	'minecraft:gold_sword': 32,
	'minecraft:gold_shovel': 32,
	'minecraft:gold_pickaxe': 32,
	'minecraft:gold_axe': 32,
	'minecraft:gold_hoe': 32,
	'minecraft:netherite_sword': 2031,
	'minecraft:netherite_shovel': 2031,
	'minecraft:netherite_pickaxe': 2031,
	'minecraft:netherite_axe': 2031,
	'minecraft:netherite_hoe': 2031,
}))

const EnchantmentItems = new Map(Object.entries<number>({
	'minecraft:book': 1,
	'minecraft:fishing_rod': 1,
	'minecraft:trident': 1,
	'minecraft:bow': 1,
	'minecraft:crossbow': 1,

	'minecraft:leather_helmet': 15,
	'minecraft:leather_chestplate': 15,
	'minecraft:leather_leggings': 15,
	'minecraft:leather_boots': 15,
	'minecraft:chainmail_helmet': 12,
	'minecraft:chainmail_chestplate': 12,
	'minecraft:chainmail_leggings': 12,
	'minecraft:chainmail_boots': 12,
	'minecraft:iron_helmet': 9,
	'minecraft:iron_chestplate': 9,
	'minecraft:iron_leggings': 9,
	'minecraft:iron_boots': 9,
	'minecraft:diamond_helmet': 10,
	'minecraft:diamond_chestplate': 10,
	'minecraft:diamond_leggings': 10,
	'minecraft:diamond_boots': 10,
	'minecraft:golden_helmet': 25,
	'minecraft:golden_chestplate': 25,
	'minecraft:golden_leggings': 25,
	'minecraft:golden_boots': 25,
	'minecraft:netherite_helmet': 15,
	'minecraft:netherite_chestplate': 15,
	'minecraft:netherite_leggings': 15,
	'minecraft:netherite_boots': 15,
	'minecraft:turtle_helmet': 15,

	'minecraft:wooden_sword': 15,
	'minecraft:wooden_shovel': 15,
	'minecraft:wooden_pickaxe': 15,
	'minecraft:wooden_axe': 15,
	'minecraft:wooden_hoe': 15,
	'minecraft:stone_sword': 5,
	'minecraft:stone_shovel': 5,
	'minecraft:stone_pickaxe': 5,
	'minecraft:stone_axe': 5,
	'minecraft:stone_hoe': 5,
	'minecraft:iron_sword': 14,
	'minecraft:iron_shovel': 14,
	'minecraft:iron_pickaxe': 14,
	'minecraft:iron_axe': 14,
	'minecraft:iron_hoe': 14,
	'minecraft:diamond_sword': 10,
	'minecraft:diamond_shovel': 10,
	'minecraft:diamond_pickaxe': 10,
	'minecraft:diamond_axe': 10,
	'minecraft:diamond_hoe': 10,
	'minecraft:gold_sword': 22,
	'minecraft:gold_shovel': 22,
	'minecraft:gold_pickaxe': 22,
	'minecraft:gold_axe': 22,
	'minecraft:gold_hoe': 22,
	'minecraft:netherite_sword': 15,
	'minecraft:netherite_shovel': 15,
	'minecraft:netherite_pickaxe': 15,
	'minecraft:netherite_axe': 15,
	'minecraft:netherite_hoe': 15,
}))

interface EnchantmentData {
	id: string
	rarity: 'common' | 'uncommon' | 'rare' | 'very_rare'
	category: 'armor' | 'armor_feet' | 'armor_legs' | 'armor_chest' | 'armor_head' | 'weapon' | 'digger' | 'fishing_rod' | 'trident' | 'breakable' | 'bow' | 'wearable' | 'crossbow' | 'vanishable'
	minLevel: number
	maxLevel: number
	minCost: (lvl: number) => number
	maxCost: (lvl: number) => number
	discoverable: boolean
	treasure: boolean
	curse: boolean
	canEnchant: (id: string) => boolean
	isCompatible: (other: string) => boolean
}

export function getEnchantmentData(id: string): EnchantmentData {
	const data = Enchantments.get(id)
	const category = data?.category ?? 'armor'
	return {
		id,
		rarity: data?.rarity ?? 'common',
		category,
		minLevel: data?.minLevel	?? 1,
		maxLevel: data?.maxLevel	?? 1,
		minCost: data?.minCost ?? ((lvl) => 1 + lvl * 10),
		maxCost: data?.maxCost ?? ((lvl) => 6 + lvl * 10),
		discoverable: data?.discoverable ?? true,
		treasure: data?.treasure ?? false,
		curse: data?.curse ?? false,
		canEnchant: id => EnchantmentsCategories.get(category)!.includes(id),
		isCompatible: data?.isCompatible ?? (() => true),
	}
}

const PROTECTION_ENCHANTS = ['minecraft:protection', 'minecraft:fire_protection', 'minecraft:blast_protection', 'minecraft:projectile_protection']
const DAMAGE_ENCHANTS = ['minecraft:sharpness', 'minecraft:smite', 'minecraft:bane_of_arthropods']

const Enchantments = new Map(Object.entries<Partial<EnchantmentData>>({
	'minecraft:protection': { rarity: 'common', category: 'armor', maxLevel: 4,
		minCost: lvl => 1 + (lvl - 1) * 11,
		maxCost: lvl => 1 + (lvl - 1) * 11 + 11,
		isCompatible: other => !PROTECTION_ENCHANTS.includes(other) },
	'minecraft:fire_protection': { rarity: 'uncommon', category: 'armor', maxLevel: 4,
		minCost: lvl => 10 + (lvl - 1) * 8,
		maxCost: lvl => 10 + (lvl - 1) * 8 + 8,
		isCompatible: other => !PROTECTION_ENCHANTS.includes(other) },
	'minecraft:feather_falling': { rarity: 'uncommon', category: 'armor_feet', maxLevel: 4,
		minCost: lvl => 5 + (lvl - 1) * 6,
		maxCost: lvl => 5 + (lvl - 1) * 6 + 6 },
	'minecraft:blast_protection': { rarity: 'rare', category: 'armor', maxLevel: 4,
		minCost: lvl => 5 + (lvl - 1) * 8,
		maxCost: lvl => 5 + (lvl - 1) * 8 + 8,
		isCompatible: other => !PROTECTION_ENCHANTS.includes(other) },
	'minecraft:projectile_protection': { rarity: 'uncommon', category: 'armor', maxLevel: 4,
		minCost: lvl => 3 + (lvl - 1) * 6,
		maxCost: lvl => 3 + (lvl - 1) * 6 + 6,
		isCompatible: other => !PROTECTION_ENCHANTS.includes(other) },
	'minecraft:respiration': { rarity: 'rare', category: 'armor_head', maxLevel: 3,
		minCost: lvl => 10 * lvl,
		maxCost: lvl => 10 * lvl + 30 },
	'minecraft:aqua_affinity': { rarity: 'rare', category: 'armor_head',
		minCost: () => 1,
		maxCost: () => 40 },
	'minecraft:thorns': { rarity: 'very_rare', category: 'armor_chest', maxLevel: 3,
		minCost: lvl => 10 + 20 * (lvl - 1),
		maxCost: lvl => 10 + 20 * (lvl - 1) + 50 },
	'minecraft:depth_strider': { rarity: 'rare', category: 'armor_feet', maxLevel: 3,
		minCost: lvl => 10 * lvl,
		maxCost: lvl => 10 * lvl + 15,
		isCompatible: other => other !== 'minecraft:frost_walker' },
	'minecraft:frost_walker': { rarity: 'rare', category: 'armor_feet', maxLevel: 2, treasure: true,
		minCost: lvl => 10 * lvl,
		maxCost: lvl => 10 * lvl + 15,
		isCompatible: other => other !== 'minecraft:depth_strider' },
	'minecraft:binding_curse': { rarity: 'very_rare', category: 'wearable', treasure: true, curse: true,
		minCost: () => 25,
		maxCost: () => 50 },
	'minecraft:soul_speed': { rarity: 'very_rare', category: 'armor_feet', maxLevel: 3,
		discoverable: false, treasure: true,
		minCost: lvl => 10 * lvl,
		maxCost: lvl => 10 * lvl + 15 },
	'minecraft:swift_sneak': { rarity: 'very_rare', category: 'armor_legs', maxLevel: 3,
		discoverable: false, treasure: true,
		minCost: lvl => 25 * lvl,
		maxCost: lvl => 25 * lvl + 50 },
	'minecraft:sharpness': { rarity: 'common', category: 'weapon', maxLevel: 5,
		minCost: lvl => 1 + (lvl - 1) * 11,
		maxCost: lvl => 1 + (lvl - 1) * 11 + 20,
		isCompatible: other => !DAMAGE_ENCHANTS.includes(other) },
	'minecraft:smite': { rarity: 'common', category: 'weapon', maxLevel: 5,
		minCost: lvl => 5 + (lvl - 1) * 8,
		maxCost: lvl => 5 + (lvl - 1) * 8 + 20,
		isCompatible: other => !DAMAGE_ENCHANTS.includes(other) },
	'minecraft:bane_of_arthropods': { rarity: 'common', category: 'weapon', maxLevel: 5,
		minCost: lvl => 5 + (lvl - 1) * 8,
		maxCost: lvl => 5 + (lvl - 1) * 8 + 20,
		isCompatible: other => !DAMAGE_ENCHANTS.includes(other) },
	'minecraft:knockback': { rarity: 'uncommon', category: 'weapon', maxLevel: 2,
		minCost: lvl => 5 + 20 * (lvl - 1),
		maxCost: lvl => 1 + lvl * 10 + 50 },
	'minecraft:fire_aspect': { rarity: 'rare', category: 'weapon', maxLevel: 2,
		minCost: lvl => 5 + 20 * (lvl - 1),
		maxCost: lvl => 1 + lvl * 10 + 50 },
	'minecraft:looting': { rarity: 'rare', category: 'weapon', maxLevel: 3,
		minCost: lvl => 15 + (lvl - 1) * 9,
		maxCost: lvl => 1 + lvl * 10 + 50,
		isCompatible: other => other !== 'minecraft:silk_touch' },
	'minecraft:sweeping': { rarity: 'rare', category: 'weapon', maxLevel: 3,
		minCost: lvl => 5 + (lvl - 1) * 9,
		maxCost: lvl => 5 + (lvl - 1) * 9 + 15 },
	'minecraft:efficiency': { rarity: 'common', category: 'digger', maxLevel: 5,
		minCost: lvl => 1 + 10 * (lvl - 1),
		maxCost: lvl => 1 + lvl * 10 + 50,
		canEnchant: id => id === 'minecraft:shears' || EnchantmentsCategories.get('digger')!.includes(id) },
	'minecraft:silk_touch': { rarity: 'very_rare', category: 'digger',
		minCost: () => 15,
		maxCost: lvl => 1 + lvl * 10 + 50,
		isCompatible: other => other !== 'minecraft:fortune' },
	'minecraft:unbreaking': { rarity: 'uncommon', category: 'breakable', maxLevel: 3,
		minCost: lvl => 5 + (lvl - 1) * 8,
		maxCost: lvl => 1 + lvl * 10 + 50 },
	'minecraft:fortune': { rarity: 'rare', category: 'digger', maxLevel: 3,
		minCost: lvl => 15 + (lvl - 1) * 9,
		maxCost: lvl => 1 + lvl * 10 + 50,
		isCompatible: other => other !== 'minecraft:silk_touch' },
	'minecraft:power': { rarity: 'common', category: 'bow', maxLevel: 5,
		minCost: lvl => 1 + (lvl - 1) * 10,
		maxCost: lvl => 1 + (lvl - 1) * 10 + 15 },
	'minecraft:punch': { rarity: 'rare', category: 'bow', maxLevel: 2,
		minCost: lvl => 12 + (lvl - 1) * 20,
		maxCost: lvl => 12 + (lvl - 1) * 20 + 25 },
	'minecraft:flame': { rarity: 'rare', category: 'bow',
		minCost: () => 20,
		maxCost: () => 50 },
	'minecraft:infinity': { rarity: 'very_rare', category: 'bow',
		minCost: () => 20,
		maxCost: () => 50,
		isCompatible: other => other !== 'minecraft:mending' },
	'minecraft:luck_of_the_sea': { rarity: 'rare', category: 'fishing_rod', maxLevel: 3,
		minCost: lvl => 15 + (lvl - 1) * 9,
		maxCost: lvl => 1 + lvl * 10 + 50,
		isCompatible: other => other !== 'minecraft:silk_touch' },
	'minecraft:lure': { rarity: 'rare', category: 'fishing_rod', maxLevel: 3,
		minCost: lvl => 15 + (lvl - 1) * 9,
		maxCost: lvl => 1 + lvl * 10 + 50 },
	'minecraft:loyalty': { rarity: 'uncommon', category: 'trident', maxLevel: 3,
		minCost: lvl => 5 + lvl * 7,
		maxCost: () => 50 },
	'minecraft:impaling': { rarity: 'rare', category: 'trident', maxLevel: 5,
		minCost: lvl => 1 + (lvl - 1) * 8,
		maxCost: lvl => 1 + (lvl - 1) * 8 + 20 },
	'minecraft:riptide': { rarity: 'rare', category: 'trident', maxLevel: 3,
		minCost: lvl => 5 + lvl * 7,
		maxCost: () => 50,
		isCompatible: other => !['minecraft:riptide', 'minecraft:channeling'].includes(other) },
	'minecraft:channeling': { rarity: 'very_rare', category: 'trident',
		minCost: () => 25,
		maxCost: () => 50 },
	'minecraft:multishot': { rarity: 'rare', category: 'crossbow',
		minCost: () => 20,
		maxCost: () => 50,
		isCompatible: other => other !== 'minecraft:piercing' },
	'minecraft:quick_charge': { rarity: 'uncommon', category: 'crossbow', maxLevel: 3,
		minCost: lvl => 12 + (lvl - 1) * 20,
		maxCost: () => 50 },
	'minecraft:piercing': { rarity: 'common', category: 'crossbow', maxLevel: 4,
		minCost: lvl => 1 + (lvl - 1) * 10,
		maxCost: () => 50,
		isCompatible: other => other !== 'minecraft:multishot' },
	'minecraft:mending': { rarity: 'rare', category: 'breakable', treasure: true,
		minCost: lvl => lvl * 25,
		maxCost: lvl => lvl * 25 + 50 },
	'minecraft:vanishing_curse': { rarity: 'very_rare', category: 'vanishable', treasure: true, curse: true,
		minCost: () => 25,
		maxCost: () => 50 },
}))

const EnchantmentsRarityWeights = new Map(Object.entries<number>({
	common: 10,
	uncommon: 5,
	rare: 2,
	very_rare: 1,
}))

const ARMOR_FEET = [
	'minecraft:leather_boots',
	'minecraft:chainmail_boots',
	'minecraft:iron_boots',
	'minecraft:diamond_boots',
	'minecraft:golden_boots',
	'minecraft:netherite_boots',
]
const ARMOR_LEGS = [
	'minecraft:leather_leggings',
	'minecraft:chainmail_leggings',
	'minecraft:iron_leggings',
	'minecraft:diamond_leggings',
	'minecraft:golden_leggings',
	'minecraft:netherite_leggings',
]
const ARMOR_CHEST = [
	'minecraft:leather_chestplate',
	'minecraft:chainmail_chestplate',
	'minecraft:iron_chestplate',
	'minecraft:diamond_chestplate',
	'minecraft:golden_chestplate',
	'minecraft:netherite_chestplate',
]
const ARMOR_HEAD = [
	'minecraft:leather_helmet',
	'minecraft:chainmail_helmet',
	'minecraft:iron_helmet',
	'minecraft:diamond_helmet',
	'minecraft:golden_helmet',
	'minecraft:netherite_helmet',
	'minecraft:turtle_helmet',
]
const ARMOR = [...ARMOR_FEET, ...ARMOR_LEGS, ...ARMOR_CHEST, ...ARMOR_HEAD]
const SWORD = [
	'minecraft:wooden_sword',
	'minecraft:stone_sword',
	'minecraft:iron_sword',
	'minecraft:diamond_sword',
	'minecraft:gold_sword',
	'minecraft:netherite_sword',
]
const DIGGER = [
	'minecraft:wooden_shovel',
	'minecraft:wooden_pickaxe',
	'minecraft:wooden_axe',
	'minecraft:wooden_hoe',
	'minecraft:stone_shovel',
	'minecraft:stone_pickaxe',
	'minecraft:stone_axe',
	'minecraft:stone_hoe',
	'minecraft:iron_shovel',
	'minecraft:iron_pickaxe',
	'minecraft:iron_axe',
	'minecraft:iron_hoe',
	'minecraft:diamond_shovel',
	'minecraft:diamond_pickaxe',
	'minecraft:diamond_axe',
	'minecraft:diamond_hoe',
	'minecraft:gold_shovel',
	'minecraft:gold_pickaxe',
	'minecraft:gold_axe',
	'minecraft:gold_hoe',
	'minecraft:netherite_shovel',
	'minecraft:netherite_pickaxe',
	'minecraft:netherite_axe',
	'minecraft:netherite_hoe',
]
const BREAKABLE = [...MaxDamageItems.keys()]
const WEARABLE = [
	...ARMOR,
	'minecraft:elytra',
	'minecraft:carved_pumpkin',
	'minecraft:creeper_head',
	'minecraft:dragon_head',
	'minecraft:player_head',
	'minecraft:zombie_head',
]

const EnchantmentsCategories = new Map(Object.entries<string[]>({
	armor: ARMOR,
	armor_feet: ARMOR_FEET,
	armor_legs: ARMOR_LEGS,
	armor_chest: ARMOR_CHEST,
	armor_head: ARMOR_HEAD,
	weapon: SWORD,
	digger: DIGGER,
	fishing_rod: ['minecraft:fishing_rod'],
	trident: ['minecraft:trident'],
	breakable: BREAKABLE,
	bow: ['minecraft:bow'],
	wearable: WEARABLE,
	crossbow: ['minecraft:crossbow'],
	vanishable: [...BREAKABLE, 'minecraft:compass'],
}))

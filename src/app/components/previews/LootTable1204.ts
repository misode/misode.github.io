import type { Random } from 'deepslate-1.20.4/core'
import { Enchantment, Identifier, ItemStack, LegacyRandom } from 'deepslate-1.20.4/core'
import { NbtCompound, NbtInt, NbtList, NbtShort, NbtString, NbtTag, NbtType } from 'deepslate-1.20.4/nbt'
import type { VersionId } from '../../services/Schemas.js'
import { clamp, getWeightedRandom, isObject } from '../../Utils.js'

export interface SlottedItem {
	slot: number,
	item: ItemStack,
}

type ItemConsumer = (item: ItemStack) => void

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
	getItemTag(id: string): string[],
	getLootTable(id: string): any,
	getPredicate(id: string): any,
}

interface LootContext extends LootOptions {
	random: Random,
	luck: number
	weather: string,
	dayTime: number,
}

export function generateLootTable(lootTable: any, options: LootOptions) {
	const ctx = createLootContext(options)
	const result: ItemStack[] = []
	generateTable(lootTable, item => result.push(item), ctx)
	const mixer = StackMixers[options.stackMixer]
	return mixer(result, ctx)
}

const SLOT_COUNT = 27

function fillContainer(items: ItemStack[], ctx: LootContext): SlottedItem[] {
	const slots = shuffle([...Array(SLOT_COUNT)].map((_, i) => i), ctx)
	
	const queue = items.filter(i => !i.is('air') && i.count > 1)
	items = items.filter(i => !i.is('air') && i.count === 1)

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
		if (!item.is('air') && item.count > 0) {
			results.push({ slot, item })
		}
	}
	return results
}

function assignSlots(items: ItemStack[]): SlottedItem[] {
	const results: SlottedItem[] = []
	let slot = 0
	for (const item of items) {
		if (slot >= 27) {
			break
		}
		if (!item.is('air') && item.count > 0) {
			results.push({ slot, item })
			slot += 1
		}
	}
	return results
}

function splitItem(item: ItemStack, count: number): ItemStack {
	const splitCount = Math.min(count, item.count)
	const other = item.clone()
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
				ctx.getItemTag(entry.name ?? '').forEach(tagEntry => {
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
	if (typeof entry.name !== 'string') {
		return
	}
	switch (type) {
		case 'item':
			try {
				entryConsumer(new ItemStack(Identifier.parse(entry.name), 1))
			} catch (e) {}
			break
		case 'tag':
			ctx.getItemTag(entry.name).forEach(tagEntry => {
				try {
					entryConsumer(new ItemStack(Identifier.parse(tagEntry), 1))
				} catch (e) {}
			})
			break
		case 'loot_table':
			const lootTable = ctx.getLootTable(entry.name)
			if (lootTable !== undefined) {
				generateTable(lootTable, entryConsumer, ctx)
			}
			break
		case 'dynamic':
			// not relevant for this simulation
			break
	}
}

function computeWeight(entry: any, luck: number) {
	return Math.max(Math.floor((entry.weight ?? 1) + (entry.quality ?? 0) * luck), 0)
}

type LootFunction = (item: ItemStack, ctx: LootContext) => void

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
			if (Array.isArray(fn)) {
				composeFunctions(fn)
			} else if (composeConditions(fn.conditions ?? [])(ctx)) {
				const type = fn.function?.replace(/^minecraft:/, '');
				(LootFunctions[type]?.(fn) ?? (i => i))(item, ctx)
			}
		}
	}
}

const LootFunctions: Record<string, (params: any) => LootFunction> = {
	enchant_randomly: ({ enchantments }) => (item, ctx) => {
		const isBook = item.is('book')
		if (enchantments === undefined || enchantments.length === 0) {
			enchantments = Enchantment.REGISTRY.map((_, ench) => ench)
				.filter(ench => ench.isDiscoverable && (isBook || Enchantment.canEnchant(item, ench)))
				.map(e => e.id.toString())
		}
		if (enchantments.length > 0) {
			const id = enchantments[ctx.random.nextInt(enchantments.length)]
			let ench: Enchantment | undefined
			try {
				ench = Enchantment.REGISTRY.get(Identifier.parse(id))
			} catch (e) {}
			if (ench === undefined) return
			const lvl = ctx.random.nextInt(ench.maxLevel - ench.minLevel + 1) + ench.minLevel
			if (isBook) {
				item.tag = new NbtCompound()
				item.count = 1
			}
			enchantItem(item, { id, lvl })
			if (isBook) {
				item.id = Identifier.create('enchanted_book')
			}
		}
	},
	enchant_with_levels: ({ levels, treasure }) => (item, ctx) => {
		const enchants = selectEnchantments(ctx.random, item, computeInt(levels, ctx), treasure)
		const isBook = item.is('book')
		if (isBook) {
			item.count = 1
			item.tag = new NbtCompound()
		}
		for (const enchant of enchants) {
			enchantItem(item, enchant)
		}
		if (isBook) {
			item.id = Identifier.create('enchanted_book')
		}
	},
	exploration_map: ({ decoration }) => (item) => {
		if (!item.is('map')) {
			return
		}
		item.id = Identifier.create('filled_map')
		const color = decoration === 'mansion' ? 5393476 : decoration === 'monument' ? 3830373 : -1
		if (color >= 0) {
			getOrCreateTag(item, 'display').set('MapColor', new NbtInt(color))
		}
	},
	limit_count: ({ limit }) => (item, ctx) => {
		const { min, max } = prepareIntRange(limit, ctx)
		item.count = clamp(item.count, min, max )
	},
	sequence: ({ functions }) => (item, ctx) => {
		if (!Array.isArray(functions)) return
		composeFunctions(functions)(item, ctx)
	},
	set_count: ({ count, add }) => (item, ctx) => {
		const oldCount = add ? (item.count) : 0
		item.count = clamp(oldCount + computeInt(count, ctx), 0, 64)
	},
	set_damage: ({ damage, add }) => (item, ctx) => {
		const maxDamage = item.getItem().durability
		if (maxDamage) {
			const oldDamage = add ? 1 - item.tag.getNumber('Damage') / maxDamage : 0
			const newDamage = 1 - clamp(computeFloat(damage, ctx) + oldDamage, 0, 1)
			const finalDamage = Math.floor(newDamage * maxDamage)
			item.tag.set('Damage', new NbtInt(finalDamage))
		}
	},
	set_enchantments: ({ enchantments, add }) => (item, ctx) => {
		Object.entries(enchantments).forEach(([id, level]) => {
			const lvl = computeInt(level, ctx)
			try {
				enchantItem(item, { id: Identifier.parse(id), lvl }, add)
			} catch (e) {}
		})
	},
	set_lore: ({ lore, replace }) => (item) => {
		const lines: string[] = lore.flatMap((line: any) => line !== undefined ? [JSON.stringify(line)] : [])
		const newLore = replace ? lines : [...item.tag.getCompound('display').getList('Lore', NbtType.String).map(s => s.getAsString()), ...lines]
		getOrCreateTag(item, 'display').set('Lore', new NbtList(newLore.map(l => new NbtString(l))))
	},
	set_name: ({ name }) => (item) => {
		if (name !== undefined) {
			const newName = JSON.stringify(name)
			getOrCreateTag(item, 'display').set('Name', new NbtString(newName))
		}
	},
	set_nbt: ({ tag }) => (item) => {
		try {
			const newTag = NbtTag.fromString(tag)
			if (newTag.isCompound()) {
				item.tag = newTag
			}
		} catch (e) {}
	},
	set_potion: ({ id }) => (item) => {
		if (typeof id === 'string') {
			try {
				item.tag.set('Potion', new NbtString(Identifier.parse(id).toString()))
			} catch (e) {}
		}
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
	if (Array.isArray(condition)) {
		return composeConditions(condition)(ctx)
	}
	const type = condition.condition?.replace(/^minecraft:/, '')
	return (LootConditions[type]?.(condition) ?? (() => true))(ctx)
}

const LootConditions: Record<string, (params: any) => LootCondition> = {
	alternative: params => LootConditions['any_of'](params),
	all_of: ({ terms }) => (ctx) => {
		if (!Array.isArray(terms) || terms.length === 0) return true
		for (const term of terms) {
			if (!testCondition(term, ctx)) {
				return false
			}
		}
		return true
	},
	any_of: ({ terms }) => (ctx) => {
		if (!Array.isArray(terms) || terms.length === 0) return true
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
	if (typeof provider === 'number') return Math.round(provider)
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

function enchantItem(item: ItemStack, enchant: Enchant, additive?: boolean) {
	const listKey = item.is('book') ? 'StoredEnchantments' : 'Enchantments'
	if (!item.tag.hasList(listKey, NbtType.Compound)) {
		item.tag.set(listKey, new NbtList())
	}
	const enchantments = item.tag.getList(listKey, NbtType.Compound).getItems()
	let index = enchantments.findIndex((e: any) => e.id === enchant.id)
	if (index !== -1) {
		const oldEnch = enchantments[index]
		oldEnch.set('lvl', new NbtShort(Math.max(additive ? oldEnch.getNumber('lvl') + enchant.lvl : enchant.lvl, 0)))
	} else {
		enchantments.push(new NbtCompound().set('id', new NbtString(enchant.id.toString())).set('lvl', new NbtShort(enchant.lvl)))
		index = enchantments.length - 1
	}
	if (enchantments[index].getNumber('lvl') === 0) {
		enchantments.splice(index, 1)
	}
	item.tag.set(listKey, new NbtList(enchantments))
}

function selectEnchantments(random: Random, item: ItemStack, levels: number, treasure: boolean): Enchant[] {
	const enchantmentValue = item.getItem().enchantmentValue
	if (enchantmentValue === undefined) {
		return []
	}
	levels += 1 + random.nextInt(Math.floor(enchantmentValue / 4 + 1)) + random.nextInt(Math.floor(enchantmentValue / 4 + 1))
	const f = (random.nextFloat() + random.nextFloat() - 1) * 0.15
	levels = clamp(Math.round(levels + levels * f), 1, Number.MAX_SAFE_INTEGER)
	let available = getAvailableEnchantments(item, levels, treasure)
	if (available.length === 0) {
		return []
	}
	const result: Enchant[] = []
	const first = getWeightedRandom(random, available, getEnchantWeight)
	if (first) result.push(first)

	while (random.nextInt(50) <= levels) {
		if (result.length > 0) {
			const lastAdded = result[result.length - 1]
			available = available.filter(a => Enchantment.isCompatible(Enchantment.REGISTRY.getOrThrow(a.id), Enchantment.REGISTRY.getOrThrow(lastAdded.id)))
		}
		if (available.length === 0) break
		const ench = getWeightedRandom(random, available, getEnchantWeight)
		if (ench) result.push(ench)
		levels = Math.floor(levels / 2)
	}

	return result
}

const EnchantmentsRarityWeights = new Map(Object.entries<number>({
	common: 10,
	uncommon: 5,
	rare: 2,
	very_rare: 1,
}))

function getEnchantWeight(ench: Enchant) {
	return EnchantmentsRarityWeights.get(Enchantment.REGISTRY.get(ench.id)?.rarity ?? 'common') ?? 10
}

function getAvailableEnchantments(item: ItemStack, levels: number, treasure: boolean): Enchant[] {
	const result: Enchant[] = []
	const isBook = item.is('book')

	Enchantment.REGISTRY.forEach((id, ench) => {
		if ((!ench.isTreasure || treasure) && ench.isDiscoverable && (Enchantment.canEnchant(item, ench) || isBook)) {
			for (let lvl = ench.maxLevel; lvl > ench.minLevel - 1; lvl -= 1) {
				if (levels >= ench.minCost(lvl) && levels <= ench.maxCost(lvl)) {
					result.push({ id, lvl })
				}
			}
		}
	})
	return result
}

interface Enchant {
	id: Identifier,
	lvl: number,
}

const AlwaysHasGlint = new Set([
	'minecraft:debug_stick',
	'minecraft:enchanted_golden_apple',
	'minecraft:enchanted_book',
	'minecraft:end_crystal',
	'minecraft:experience_bottle',
	'minecraft:written_book',
])

export function itemHasGlint(item: ItemStack) {
	if (AlwaysHasGlint.has(item.id.toString())) {
		return true
	}
	if (item.is('compass') && (item.tag.has('LodestoneDimension') || item.tag.has('LodestonePos'))) {
		return true
	}
	if ((item.is('potion') || item.is('splash_potion') || item.is('lingering_potion')) && (item.tag.has('Potion') || item.tag.has('CustomPotionEffects'))) {
		return true
	}
	if (item.tag.getList('Enchantments').length > 0 || item.tag.getList('StoredEnchantments').length > 0) {
		return true
	}
	return false
}

function getOrCreateTag(item: ItemStack, key: string) {
	if (item.tag.hasCompound(key)) {
		return item.tag.getCompound(key)
	} else {
		const tag = new NbtCompound()
		item.tag.set(key, tag)
		return tag
	}
}

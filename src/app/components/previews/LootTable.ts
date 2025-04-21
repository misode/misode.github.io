import type { ItemComponentsProvider } from 'deepslate'
import { NbtByte, NbtDouble, NbtLong } from 'deepslate'
import type { Random } from 'deepslate/core'
import { Identifier, ItemStack, LegacyRandom } from 'deepslate/core'
import { NbtCompound, NbtInt, NbtList, NbtString, NbtTag } from 'deepslate/nbt'
import { ResolvedItem } from '../../services/ResolvedItem.js'
import type { VersionId } from '../../services/Versions.js'
import { checkVersion } from '../../services/Versions.js'
import { clamp, getWeightedRandom, isObject, jsonToNbt } from '../../Utils.js'

export interface SlottedItem {
	slot: number,
	item: ResolvedItem,
}

type ItemConsumer = (item: ResolvedItem) => void

const StackMixers = {
	container: fillContainer,
	default: assignSlots,
}

type StackMixer = keyof typeof StackMixers

interface LootOptions extends ItemComponentsProvider {
	version: VersionId,
	seed: bigint,
	luck: number,
	daytime: number,
	weather: string,
	stackMixer: StackMixer,
	getItemTag(id: string): string[],
	getLootTable(id: string): any,
	getPredicate(id: string): any,
	getEnchantments(): Map<string, any>,
	getEnchantmentTag(id: string): string[],
}

interface LootContext extends LootOptions {
	random: Random,
	luck: number
	weather: string,
	dayTime: number,
}

export function generateLootTable(lootTable: any, options: LootOptions) {
	const ctx = createLootContext(options)
	const result: ResolvedItem[] = []
	generateTable(lootTable, item => result.push(item), ctx)
	const mixer = StackMixers[options.stackMixer]
	return mixer(result, ctx)
}

const SLOT_COUNT = 27

function fillContainer(items: ResolvedItem[], ctx: LootContext): SlottedItem[] {
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

function assignSlots(items: ResolvedItem[]): SlottedItem[] {
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

function splitItem(item: ResolvedItem, count: number): ResolvedItem {
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
	if (!Array.isArray(table.pools)) {
		return
	}
	const tableConsumer = decorateFunctions(table.functions ?? [], consumer, ctx)
	for (const pool of table.pools) {
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
			const id = Identifier.parse(entry.name)
			entryConsumer(new ResolvedItem(new ItemStack(id, 1), ctx.getItemComponents(id)))
			break
		case 'tag':
			ctx.getItemTag(entry.name).forEach(tagEntry => {
				const id = Identifier.parse(tagEntry)
				entryConsumer(new ResolvedItem(new ItemStack(id, 1), ctx.getItemComponents(id)))
			})
			break
		case 'loot_table':
			const lootTable = typeof entry.value === 'string' ? ctx.getLootTable(entry.value) : entry.value
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

type LootFunction = (item: ResolvedItem, ctx: LootContext) => void

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
			} else if (isObject(fn) && composeConditions(fn.conditions ?? [])(ctx)) {
				const type = fn.function?.replace(/^minecraft:/, '');
				(LootFunctions[type]?.(fn) ?? (i => i))(item, ctx)
			}
		}
	}
}

const LootFunctions: Record<string, (params: any) => LootFunction> = {
	enchant_randomly: ({ options, only_compatible }) => (item, ctx) => {
		let enchantments = options
			? getHomogeneousList(options, ctx.getEnchantmentTag)
			: [...ctx.getEnchantments().keys()]
		if (!item.is('book') && (only_compatible ?? true)) {
			enchantments = enchantments.filter(e => {
				const ench = ctx.getEnchantments().get(e.replace(/^minecraft:/, ''))
				if (!ench) return true
				const supportedItems = getHomogeneousList(ench.supported_items, ctx.getItemTag)
				return supportedItems.some(i => item.is(i))
			})
		}
		if (enchantments.length === 0) {
			return
		}
		const pick = enchantments[ctx.random.nextInt(enchantments.length)]
		const maxLevel = ctx.getEnchantments().get(pick.replace(/^minecraft:/, ''))?.max_level ?? 1
		const level = ctx.random.nextInt(maxLevel - 1) + 1
		if (item.is('book')) {
			item.id = Identifier.create('enchanted_book')
			item.base = ctx.getItemComponents(item.id)
		}
		updateEnchantments(item, levels => {
			return levels.set(Identifier.parse(pick).toString(), level)
		})
	},
	enchant_with_levels: ({ options, levels }) => (item, ctx) => {
		const allowed = getHomogeneousList(options, ctx.getEnchantmentTag)
		const selected = selectEnchantments(item, computeInt(levels, ctx), allowed, ctx)
		if (item.is('book')) {
			item.id = Identifier.create('enchanted_book')
			item.base = ctx.getItemComponents(item.id)
		}
		updateEnchantments(item, levelsMap => {
			for (const { id, lvl } of selected) {
				levelsMap.set(id.toString(), lvl)
			}
			return levelsMap
		})
	},
	exploration_map: ({ decoration }) => (item) => {
		if (!item.is('map')) {
			return
		}
		item.id = Identifier.create('filled_map')
		const color = decoration === 'mansion' ? 5393476 : decoration === 'monument' ? 3830373 : -1
		if (color >= 0) {
			item.set('map_color', new NbtInt(color))
		}
	},
	filtered: ({ item_filter, modifier }) => (item, ctx) => {
		if (testItemPredicate(item_filter, item, ctx)) {
			composeFunctions([modifier])(item, ctx)
		}
	},
	limit_count: ({ limit }) => (item, ctx) => {
		const { min, max } = prepareIntRange(limit, ctx)
		item.count = clamp(item.count, min, max)
	},
	sequence: ({ functions }) => (item, ctx) => {
		if (!Array.isArray(functions)) return
		composeFunctions(functions)(item, ctx)
	},
	set_attributes: ({ modifiers, replace }) => (item, ctx) => {
		if (!Array.isArray(modifiers)) return
		const newModifiers = modifiers.map<AttributeModifier>(m => {
			if (!isObject(m)) m = {}
			return {
				id: Identifier.parse(typeof m.id === 'string' ? m.id : ''),
				type: Identifier.parse(typeof m.attribute === 'string' ? m.attribute : ''),
				amount: computeFloat(m.amount, ctx),
				operation: typeof m.operation === 'string' ? m.operation : 'add_value',
				slot: typeof m.slot === 'string' ? m.slot : Array.isArray(m.slot) ? m.slot[ctx.random.nextInt(m.slot.length)] : 'any',
			}
		})
		updateAttributes(item, (modifiers) => {
			if (replace === false) {
				return [...modifiers, ...newModifiers]
			} else {
				return newModifiers
			}
		})
	},
	set_banner_pattern: ({ patterns, append }) => (item) => {
		if (!Array.isArray(patterns)) return
		if (append) {
			const existing = item.get('banner_patterns', tag => tag.isList() ? tag : undefined) ?? new NbtList()
			item.set('banner_patterns', new NbtList([...existing.getItems(), ...patterns.map(jsonToNbt)]))
		} else {
			item.set('banner_patterns', jsonToNbt(patterns))
		}
	},
	set_book_cover: ({ title, author, generation }) => (item) => {
		const content = item.get('written_book_content', tag => tag.isCompound() ? tag : undefined) ?? new NbtCompound()
		const newContent = new NbtCompound()
			.set('title', title !== undefined ? jsonToNbt(title) : content.get('title') ?? new NbtString(''))
			.set('author', author !== undefined ? jsonToNbt(author) : content.get('author') ?? new NbtString(''))
			.set('generation', generation !== undefined ? jsonToNbt(generation) : content.get('generation') ?? new NbtInt(0))
			.set('pages', content.getList('pages'))
			.set('resolved', content.get('resolved') ?? new NbtByte(1))
		item.set('written_book_content', newContent)
	},
	set_components: ({ components }) => (item) => {
		if (!isObject(components)) {
			return
		}
		for (const [key, value] of Object.entries(components)) {
			item.set(key, jsonToNbt(value))
		}
	},
	set_contents: ({ component, entries }) => (item, ctx) => {
		if (typeof component !== 'string' || !Array.isArray(entries)) {
			return
		}
		const result = generateLootTable({ pools: [{ rolls: 1, entries: entries }] }, ctx)
		if (Identifier.parse(component).is('container')) {
			item.set(component, new NbtList(result.map(s => new NbtCompound()
				.set('slot', new NbtInt(s.slot))
				.set('item', s.item.toNbt())
			)))
		} else {
			item.set(component, new NbtList(result.map(s => s.item.toNbt())))
		}
	},
	set_count: ({ count, add }) => (item, ctx) => {
		const oldCount = add ? (item.count) : 0
		item.count = oldCount + computeInt(count, ctx)
	},
	set_custom_data: ({ tag }) => (item) => {
		try {
			const newTag = NbtTag.fromString(tag)
			if (newTag.isCompound()) {
				item.set('custom_data', newTag)
			}
		} catch (e) {}
	},
	set_custom_model_data: ({ value }) => (item, ctx) => {
		item.set('custom_model_data', new NbtInt(computeInt(value, ctx)))
	},
	set_damage: ({ damage, add }) => (item, ctx) => {
		if (item.isDamageable()) {
			const maxDamage = item.getMaxDamage()
			const oldDamage = add ? 1 - item.getDamage() / maxDamage : 0
			const newDamage = 1 - clamp(computeFloat(damage, ctx) + oldDamage, 0, 1)
			const finalDamage = Math.floor(newDamage * maxDamage)
			item.set('damage', new NbtInt(clamp(finalDamage, 0, maxDamage)))
		}
	},
	set_enchantments: ({ enchantments, add }) => (item, ctx) => {
		if (!isObject(enchantments)) {
			return
		}
		if (item.is('book')) {
			item.id = Identifier.create('enchanted_book')
			item.base = ctx.getItemComponents(item.id)
		}
		updateEnchantments(item, levels => {
			Object.entries(enchantments).forEach(([id, level]) => {
				id = Identifier.parse(id).toString()
				if (add) {
					levels.set(id, clamp((levels.get(id) ?? 0) + computeInt(level, ctx), 0, 255))
				} else {
					levels.set(id, clamp(computeInt(level, ctx), 0, 255))
				}
			})
			return levels
		})
	},
	set_firework_explosion: () => () => {
		// TODO
	},
	set_fireworks: () => () => {
		// TODO
	},
	set_instrument: () => () => {
		// TODO: depends on item tag
	},
	set_item: ({ item: newId }) => (item, ctx) => {
		if (typeof newId !== 'string') return
		item.id = Identifier.parse(newId)
		item.base = ctx.getItemComponents(item.id)
	},
	set_loot_table: ({ name, seed }) => (item) => {
		item.set('container_loot', new NbtCompound()
			.set('loot_table', new NbtString(Identifier.parse(typeof name === 'string' ? name : '').toString()))
			.set('seed', new NbtLong(typeof seed === 'number' ? BigInt(seed) : BigInt(0))))
	},
	set_lore: ({ lore }) => (item, ctx) => {
		if (!Array.isArray(lore)) return
		const lines: NbtTag[] = lore.flatMap((line: any) => line !== undefined ? [
			!checkVersion(ctx.version, '1.21.5')
				? new NbtString(JSON.stringify(line))
				: jsonToNbt(line),
		] : [])
		// TODO: account for mode
		item.set('lore', new NbtList(lines))
	},
	set_name: ({ name, target }) => (item, ctx) => {
		if (name !== undefined) {
			const newName = !checkVersion(ctx.version, '1.21.5')
				? new NbtString(JSON.stringify(name))
				: jsonToNbt(name)
			item.set(target ?? 'custom_name', newName)
		}
	},
	set_ominous_bottle_amplifier: ({ amplifier }) => (item, ctx) => {
		item.set('ominous_bottle_amplifier', new NbtInt(computeInt(amplifier, ctx)))
	},
	set_potion: ({ id }) => (item) => {
		if (typeof id === 'string') {
			item.set('potion_contents', new NbtString(id))
		}
	},
	toggle_tooltips: ({ toggles }) => (item) => {
		if (!isObject(toggles)) {
			return
		}
		Object.entries(toggles).forEach(([key, value]) => {
			if (typeof value !== 'boolean') return
			const tag = item.get(key, tag => tag)
			if (tag === undefined) return
			if (tag.isCompound()) {
				item.set(key, tag.set('show_in_tooltip', new NbtByte(value)))
			}
		})
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
	if (!isObject(condition) || typeof condition.condition !== 'string') {
		return false
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
	damage_source_properties: () => () => {
		return false // TODO
	},
	entity_properties: () => () => {
		return false // TODO
	},
	entity_scores: () => () => {
		return false // TODO
	},
	inverted: ({ term }) => (ctx) => {
		return !testCondition(term, ctx)
	},
	killed_by_player: ({ inverted }) => () => {
		return (inverted ?? false) === false // TODO
	},
	location_check: () => () => {
		return false // TODO
	},
	match_tool: () => () => {
		return false // TODO
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
		if (!chances) {
			return false
		}
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
	const min = computeInt(range?.min, ctx)
	const max = computeInt(range?.max, ctx)
	return { min, max }
}

function getHomogeneousList(value: unknown, tagGetter: (id: string) => string[]): string[] {
	if (typeof value === 'string') {
		if (value.startsWith('#')) {
			return [...new Set(tagGetter(value.slice(1)).flatMap(e => getHomogeneousList(e, tagGetter)))]
		} else {
			return [value]
		}
	}
	if (Array.isArray(value)) {
		return value
	}
	return []
}

function testItemPredicate(predicate: any, item: ResolvedItem, ctx: LootContext) {
	if (!isObject(predicate)) return false
	if (predicate.items !== undefined) {
		const allowedItems = getHomogeneousList(predicate.items, ctx.getItemTag)
		if (!allowedItems.some(i => item.id.is(i))) {
			return false
		}
	}
	if (predicate.count !== undefined) {
		const { min, max } = prepareIntRange(predicate.count, ctx)
		if (min > item.count || item.count > max) {
			return false
		}
	}
	if (isObject(predicate.components)) {
		for (const [key, value] of Object.entries(predicate.components)) {
			const tag = jsonToNbt(value)
			const other = item.get(key, tag => tag)
			if (!other || !tag.equals(other)) {
				return false
			}
		}
	}
	// TODO: item sub predicates
	return true
}

function updateEnchantments(item: ResolvedItem, fn: (levels: Map<string, number>) => Map<string, number>) {
	const type = item.is('book') ? 'stored_enchantments' : 'enchantments'
	if (!item.has(type)) {
		return
	}
	const levelsTag = item.get(type, tag => {
		return tag.isCompound() ? tag.has('levels') ? tag.getCompound('levels') : tag : undefined
	}) ?? new NbtCompound()
	const showInTooltip = item.get(type, tag => {
		return tag.isCompound() && tag.hasCompound('levels') ? tag.get('show_in_tooltip') : undefined
	}) ?? new NbtByte(1)
	const levels = new Map<string, number>()
	levelsTag.forEach((id, lvl) => {
		levels.set(Identifier.parse(id).toString(), lvl.getAsNumber())
	})

	const newLevels = fn(levels)

	const newLevelsTag = new NbtCompound()
	for (const [key, lvl] of newLevels) {
		if (lvl > 0) {
			newLevelsTag.set(key, new NbtInt(lvl))
		}
	}
	const newTag = new NbtCompound()
		.set('levels', newLevelsTag)
		.set('show_in_tooltip', showInTooltip)
	item.set(type, newTag)
}

interface AttributeModifier {
	id: Identifier,
	type: Identifier,
	amount: number,
	operation: string,
	slot: string,
}

function updateAttributes(item: ResolvedItem, fn: (modifiers: AttributeModifier[]) => AttributeModifier[]) {
	const modifiersTag = item.get('attribute_modifiers', tag => {
		return tag.isCompound() ? tag.getList('modifiers') : tag.isList() ? tag : undefined
	}) ?? new NbtList()
	const showInTooltip = item.get('attribute_modifiers', tag => {
		return tag.isCompound() ? tag.get('show_in_tooltip') : undefined
	}) ?? new NbtByte(1)
	const modifiers = modifiersTag.map<AttributeModifier>(m => {
		const root = m.isCompound() ? m : new NbtCompound()
		return {
			id: Identifier.parse(root.getString('id')),
			type: Identifier.parse(root.getString('type')),
			amount: root.getNumber('amount'),
			operation: root.getString('operation'),
			slot: root.getString('slot'),
		}
	})

	const newModifiers = fn(modifiers)

	const newModifiersTag = new NbtList(newModifiers.map(m => {
		return new NbtCompound()
			.set('id', new NbtString(m.id.toString()))
			.set('type', new NbtString(m.type.toString()))
			.set('amount', new NbtDouble(m.amount))
			.set('operation', new NbtString(m.operation))
			.set('slot', new NbtString(m.slot))
	}))
	const newTag = new NbtCompound()
		.set('modifiers', newModifiersTag)
		.set('show_in_tooltip', showInTooltip)
	item.set('attribute_modifiers', newTag)
}

interface Enchant {
	id: Identifier
	lvl: number
}

function selectEnchantments(item: ResolvedItem, levels: number, options: string[], ctx: LootContext): Enchant[] {
	const enchantable = item.get('enchantable', tag => tag.isCompound() ? tag.getNumber('value') : undefined)
	if (enchantable === undefined) {
		return []
	}
	let cost = levels + 1 + ctx.random.nextInt(Math.floor(enchantable / 4 + 1)) + ctx.random.nextInt(Math.floor(enchantable / 4 + 1))
	const f = (ctx.random.nextFloat() + ctx.random.nextFloat() - 1) * 0.15
	cost = clamp(Math.round(cost + cost * f), 1, Number.MAX_SAFE_INTEGER)
	let available = getAvailableEnchantments(item, cost, options, ctx)
	if (available.length === 0) {
		return []
	}
	function getEnchantWeight(ench: Enchant): number {
		return ctx.getEnchantments().get(ench.id.toString().replace(/^minecraft:/, ''))?.weight ?? 0
	}
	const result: Enchant[] = []
	const first = getWeightedRandom(ctx.random, available, getEnchantWeight)
	if (first) result.push(first)

	while (ctx.random.nextInt(50) <= cost) {
		if (result.length > 0) {
			const lastAdded = result[result.length - 1]
			available = available.filter(a => areCompatibleEnchantments(a, lastAdded, ctx))
		}
		if (available.length === 0) break
		const ench = getWeightedRandom(ctx.random, available, getEnchantWeight)
		if (ench) result.push(ench)
		cost = Math.floor(cost / 2)
	}

	return result
}

function getAvailableEnchantments(item: ResolvedItem, cost: number, options: string[], ctx: LootContext): Enchant[] {
	const result: Enchant[] = []
	for (const id of options) {
		const ench = ctx.getEnchantments().get(id.replace(/^minecraft:/, ''))
		if (ench === undefined) continue
		const primaryItems = getHomogeneousList(ench.primary_items ?? ench.supported_items, ctx.getItemTag)
		if (item.is('book') || primaryItems.some((i: string) => item.id.is(i))) {
			for (let lvl = ench.max_level; lvl > 0; lvl -= 1) {
				if (cost >= enchantmentCost(ench.min_cost, lvl) && cost <= enchantmentCost(ench.max_cost, lvl)) {
					result.push({ id: Identifier.parse(id), lvl })
				}
			}
		}
	}
	return result
}

function enchantmentCost(value: any, level: number): number {
	return value.base + value.per_level_above_first * (level - 1)
}

function areCompatibleEnchantments(a: Enchant, b: Enchant, ctx: LootContext) {
	if (a.id.equals(b.id)) {
		return false
	}
	const enchA = ctx.getEnchantments().get(a.id.toString().replace(/^minecraft:/, ''))
	const exclusiveA = getHomogeneousList(enchA?.exclusive_set ?? [], ctx.getEnchantmentTag)
	if (exclusiveA.some(id => b.id.is(id))) {
		return false
	}
	const enchB = ctx.getEnchantments().get(b.id.toString().replace(/^minecraft:/, ''))
	const exclusiveB = getHomogeneousList(enchB?.exclusive_set ?? [], ctx.getEnchantmentTag)
	if (exclusiveB.some(id => a.id.is(id))) {
		return false
	}
	return true
}

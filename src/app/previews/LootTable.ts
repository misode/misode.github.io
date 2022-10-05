import type { Random } from 'deepslate'
import { LegacyRandom } from 'deepslate'
import type { VersionId } from '../services/Schemas.js'
import { clamp, isObject } from '../Utils.js'

export interface Item {
	id: string,
	count: number,
}

type ItemConsumer = (item: Item) => void

interface LootOptions {
	version: VersionId,
	seed: bigint,
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
	const compositeFunction = composeFunctions(lootTable.functions ?? [])
	const tableConsumer = (item: Item) => result.push(compositeFunction(item, ctx))
	generateTable(lootTable, tableConsumer, ctx)
	return result
}

function generateTable(table: any, consumer: ItemConsumer, ctx: LootContext) {
	for (const pool of table.pools ?? []) {
		generatePool(pool, consumer, ctx)
	}
}

function createLootContext(options: LootOptions): LootContext {
	return {
		...options,
		random: new LegacyRandom(options.seed),
		luck: 0,
		weather: 'clear',
		dayTime: 0,
		getItemTag: () => [],
		getLootTable: () => ({ pools: [] }),
		getPredicate: () => [],
	}
}

function generatePool(pool: any, consumer: ItemConsumer, ctx: LootContext) {
	if (composeConditions(pool.conditions ?? [])(ctx)) {
		const compositeFunction = composeFunctions(pool.functions ?? [])
		const poolConsumer = (item: Item) => consumer(compositeFunction(item, ctx))

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
	const compositeFunction = composeFunctions(entry.functions ?? [])
	const entryConsumer = (item: Item) => consumer(compositeFunction(item, ctx))
	
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

type LootFunction = (item: Item, ctx: LootContext) => Item

function composeFunctions(functions: any[]): LootFunction {
	return (item, ctx) => {
		for (const fn of functions) {
			if (composeFunctions(fn.conditions ?? [])(item, ctx)) {
				const type = fn.function?.replace(/^minecraft:/, '')
				item = (LootFunctions[type]?.(fn) ?? (i => i))(item, ctx)
			}
		}
		return item
	}
}

const LootFunctions: Record<string, (params: any) => LootFunction> = {
	set_count: ({ count }) => (item, ctx) => {
		return { ...item, count: computeInt(count, ctx) }
	},
	limit_count: ({ limit }) => (item, ctx) => {
		const { min, max } = prepareIntRange(limit, ctx)
		return { ...item, count: clamp(item.count, min, max )}
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
		return min <= value && value <= max
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

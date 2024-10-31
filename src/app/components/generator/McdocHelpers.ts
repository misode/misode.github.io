import * as core from '@spyglassmc/core'
import type { JsonNode } from '@spyglassmc/json'
import { JsonArrayNode, JsonObjectNode, JsonStringNode } from '@spyglassmc/json'
import { JsonStringOptions } from '@spyglassmc/json/lib/parser/string.js'
import type { ListType, McdocType, NumericRange, NumericType, PrimitiveArrayType, TupleType, UnionType } from '@spyglassmc/mcdoc'
import type { McdocCheckerContext, SimplifiedMcdocType, SimplifiedMcdocTypeNoUnion, SimplifyValueNode } from '@spyglassmc/mcdoc/lib/runtime/checker/index.js'
import { simplify } from '@spyglassmc/mcdoc/lib/runtime/checker/index.js'

export function getDefault(type: SimplifiedMcdocType, range: core.Range, ctx: core.CheckerContext): JsonNode {
	if (type.kind === 'string') {
		return JsonStringNode.mock(range)
	}
	if (type.kind === 'boolean') {
		return { type: 'json:boolean', range, value: false }
	}
	if (isNumericType(type)) {
		const value: core.LongNode = { type: 'long', range, value: BigInt(0) }
		return { type: 'json:number', range, value, children: [value] }
	}
	if (type.kind === 'struct' || type.kind === 'any' || type.kind === 'unsafe') {
		const object = JsonObjectNode.mock(range)
		if (type.kind === 'struct') {
			for (const field of type.fields) {
				if (field.kind === 'pair' && !field.optional && (typeof field.key === 'string' || field.key.kind === 'literal')) {
					const key: JsonStringNode = {
						type: 'json:string',
						range,
						options: JsonStringOptions,
						value: typeof field.key === 'string' ? field.key : field.key.value.value.toString(),
						valueMap: [{ inner: core.Range.create(0), outer: core.Range.create(range.start) }],
					}
					const value = getDefault(simplifyType(field.type, ctx), range, ctx)
					const pair: core.PairNode<JsonStringNode, JsonNode> = {
						type: 'pair',
						range,
						key: key,
						value: value,
						children: [key, value],
					}
					key.parent = pair
					value.parent = pair
					object.children.push(pair)
					pair.parent = object
				}
			}
		}
		return object
	}
	if (isListOrArray(type)) {
		const array = JsonArrayNode.mock(range)
		const minLength = type.lengthRange?.min ?? 0
		if (minLength > 0) {
			for (let i = 0; i < minLength; i += 1) {
				const child = getDefault(simplifyType(getItemType(type), ctx), range, ctx)
				const itemNode: core.ItemNode<JsonNode> = {
					type: 'item',
					range,
					children: [child],
					value: child,
				}
				child.parent = itemNode
				array.children.push(itemNode)
				itemNode.parent = array
			}
		}
		return array
	}
	if (type.kind === 'tuple') {
		return {
			type: 'json:array',
			range,
			children: type.items.map(item => {
				const valueNode = getDefault(simplifyType(item, ctx), range, ctx)
				const itemNode: core.ItemNode<JsonNode> = {
					type: 'item',
					range,
					children: [valueNode],
					value: valueNode,
				}
				valueNode.parent = itemNode
				return itemNode
			}),
		}
	}
	if (type.kind === 'union') {
		if (type.members.length === 0) {
			return { type: 'json:null', range }
		}
		return getDefault(type.members[0], range, ctx)
	}
	if (type.kind === 'enum') {
		return getDefault({ kind: 'literal', value: { kind: type.enumKind ?? 'string', value: type.values[0].value } as any }, range, ctx)
	}
	if (type.kind === 'literal') {
		if (type.value.kind === 'string') {
			return { type: 'json:string', range, options: JsonStringOptions, value: type.value.value, valueMap: [{ inner: core.Range.create(0), outer: core.Range.create(range.start) }] }
		}
		if (type.value.kind === 'boolean') {
			return { type: 'json:boolean', range, value: type.value.value }
		}
		const value: core.FloatNode | core.LongNode = type.value.kind === 'float' || type.value.kind === 'double'
			? { type: 'float', range, value: type.value.value }
			: { type: 'long', range, value: BigInt(type.value.value) }
		return { type: 'json:number', range, value, children: [value] }
	}
	return { type: 'json:null', range }
}

export function isNumericType(type: McdocType): type is NumericType {
	return type.kind === 'byte' || type.kind === 'short' || type.kind === 'int' || type.kind === 'long' || type.kind === 'float' || type.kind === 'double'
}

export function isListOrArray(type: McdocType): type is ListType | PrimitiveArrayType {
	return type.kind === 'list' || type.kind === 'byte_array' || type.kind === 'int_array' || type.kind === 'long_array'
}

export function getItemType(type: ListType | PrimitiveArrayType): McdocType {
	return type.kind === 'list' ? type.item
		: type.kind === 'byte_array' ? { kind: 'byte' }
			: type.kind === 'int_array' ? { kind: 'int' }
				: type.kind === 'long_array' ? { kind: 'long' }
					: { kind: 'any' }
}

export function isFixedList<T extends ListType | PrimitiveArrayType>(type: T): type is T & { lengthRange: NumericRange } {
	return type.lengthRange?.min !== undefined && type.lengthRange.min === type.lengthRange.max
}

export function isInlineTuple(type: TupleType) {
	return type.items.length <= 4 && type.items.every(isNumericType)
}

export function formatIdentifier(id: string): string {
	if (id.startsWith('!')) {
		return '! ' + formatIdentifier(id.substring(1))
	}
	const text = id
		.replace(/^minecraft:/, '')
		.replaceAll('_', ' ')
		.replace(/[a-z][A-Z]+/g, m => m.charAt(0) + ' ' + m.substring(1).toLowerCase())
	return text.charAt(0).toUpperCase() + text.substring(1)
}

export function getCategory(type: McdocType) {
	if (type.kind === 'reference' && type.path) {
		switch (type.path) {
			case '::java::data::loot::LootPool':
			case '::java::data::worldgen::dimension::Dimension':
			case '::java::data::worldgen::surface_rule::SurfaceRule':
			case '::java::data::worldgen::template_pool::WeightedElement':
				return 'pool'
			case '::java::data::loot::LootCondition':
			case '::java::data::advancement::AdvancementCriterion':
			case '::java::data::worldgen::dimension::biome_source::BiomeSource':
			case '::java::data::worldgen::processor_list::ProcessorRule':
			case '::java::data::worldgen::feature::placement::PlacementModifier':
				return 'predicate'
			case '::java::data::loot::LootFunction':
			case '::java::data::worldgen::density_function::CubicSpline':
			case '::java::data::worldgen::processor_list::Processor':
				return 'function'
		}
	}
	return undefined
}

const selectRegistries = new Set([
	'block_predicate_type',
	'chunk_status',
	'consume_effect_type',
	'creative_mode_tab',
	'data_component_type',
	'enchantment_effect_component_type',
	'enchantment_entity_effect_type',
	'enchantment_level_based_value_type',
	'enchantment_location_based_effect_type',
	'enchantment_provider_type',
	'enchantment_value_effect_type',
	'entity_sub_predicate_type',
	'float_provider_type',
	'frog_variant',
	'height_provider_type',
	'int_provider_type',
	'item_sub_predicate_type',
	'loot_condition_type',
	'loot_function_type',
	'loot_nbt_provider_type',
	'loot_number_provider_type',
	'loot_pool_entry_type',
	'loot_score_provider_type',
	'map_decoration_type',
	'number_format_type',
	'pos_rule_test',
	'position_source_type',
	'recipe_book_category',
	'recipe_display',
	'recipe_serializer',
	'recipe_type',
	'rule_block_entity_modifier',
	'rule_test',
	'slot_display',
	'stat_type',
	'trigger_type',
	'worldgen/biome_source',
	'worldgen/block_state_provider_type',
	'worldgen/carver',
	'worldgen/chunk_generator',
	'worldgen/density_function_type',
	'worldgen/feature',
	'worldgen/feature_size_type',
	'worldgen/foliage_placer_type',
	'worldgen/material_condition',
	'worldgen/material_rule',
	'worldgen/placement_modifier_type',
	'worldgen/pool_alias_binding',
	'worldgen/root_placer_type',
	'worldgen/structure_placement',
	'worldgen/structure_pool_element',
	'worldgen/structure_processor',
	'worldgen/structure_type',
	'worldgen/tree_decorator_type',
	'worldgen/trunk_placer_type',
])

export function isSelectRegistry(registry: string) {
	return selectRegistries.has(registry)
}

interface SimplifyNodeContext {
	key?: JsonStringNode
	parent?: JsonObjectNode
}
export function simplifyType(type: McdocType, ctx: core.CheckerContext, { key, parent }: SimplifyNodeContext = {}): SimplifiedMcdocType {
	const simplifyNode: SimplifyValueNode<JsonNode | undefined> = {
		entryNode: {
			parent: parent ? {
				entryNode: {
					parent: undefined,
					runtimeKey: undefined,
				},
				node: {
					originalNode: parent,
					inferredType: inferType(parent),
				},
			} : undefined,
			runtimeKey: key ? {
				originalNode: key,
				inferredType: inferType(key),
			} : undefined,
		},
		node: {
			originalNode: undefined,
			inferredType: { kind: 'any' },
		},
	}
	const context: McdocCheckerContext<JsonNode | undefined> = { 
		...ctx,
		allowMissingKeys: false,
		requireCanonical: false,
		isEquivalent: () => false,
		getChildren: (node) => {
			if (JsonObjectNode.is(node)) {
				return node.children.filter(kvp => kvp.key).map(kvp => ({
					key: { originalNode: kvp.key!, inferredType: inferType(kvp.key!) },
					possibleValues: kvp.value
						? [{ originalNode: kvp.value, inferredType: inferType(kvp.value) }]
						: [],
				}))
			}
			return []
		},
		reportError: () => {},
		attachTypeInfo: () => {},
		nodeAttacher:  () => {},
		stringAttacher:  () => {},
	}
	const result = simplify(type, { node: simplifyNode, ctx: context })
	return result.typeDef
}

function inferType(node: JsonNode): Exclude<McdocType, UnionType> {
	switch (node.type) {
		case 'json:boolean':
			return { kind: 'literal', value: { kind: 'boolean', value: node.value! } }
		case 'json:number':
			return {
				kind: 'literal',
				value: { kind: node.value.type, value: Number(node.value.value) },
			}
		case 'json:null':
			return { kind: 'any' } // null is always invalid?
		case 'json:string':
			return { kind: 'literal', value: { kind: 'string', value: node.value } }
		case 'json:array':
			return { kind: 'list', item: { kind: 'any' } }
		case 'json:object':
			return { kind: 'struct', fields: [] }
	}
}

export function quickEqualTypes(a: SimplifiedMcdocTypeNoUnion, b: SimplifiedMcdocTypeNoUnion): boolean {
	if (a === b) {
		return true
	}
	if (a.kind !== b.kind) {
		return false
	}
	if (a.kind === 'literal' && b.kind === 'literal') {
		return a.value.kind === b.value.kind && a.value.value === b.value.value
	}
	if (a.kind === 'struct' && b.kind === 'struct') {
		// Compare the first key of both structs
		const keyA = a.fields[0]?.key
		const keyB = b.fields[0]?.key
		return (!keyA && !keyB) || (keyA && keyB && quickEqualTypes(keyA, keyB))
	}
	// Types are of the same kind	
	return true
}

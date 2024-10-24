import * as core from '@spyglassmc/core'
import type { JsonNode } from '@spyglassmc/json'
import * as json from '@spyglassmc/json'
import { JsonArrayNode, JsonBooleanNode, JsonNumberNode, JsonObjectNode, JsonStringNode } from '@spyglassmc/json'
import type { ListType, LiteralType, McdocType, NumericType, PrimitiveArrayType, StringType, UnionType } from '@spyglassmc/mcdoc'
import { TypeDefSymbolData } from '@spyglassmc/mcdoc/lib/binder/index.js'
import type { McdocCheckerContext, SimplifiedEnum, SimplifiedMcdocType, SimplifiedMcdocTypeNoUnion, SimplifiedStructType, SimplifyValueNode } from '@spyglassmc/mcdoc/lib/runtime/checker/index.js'
import { simplify } from '@spyglassmc/mcdoc/lib/runtime/checker/index.js'
import { getValues } from '@spyglassmc/mcdoc/lib/runtime/completer/index.js'
import { useCallback, useMemo } from 'preact/hooks'
import { useLocale } from '../../contexts/Locale.jsx'
import { hexId } from '../../Utils.js'
import { Octicon } from '../Octicon.jsx'

export interface McdocContext extends core.CheckerContext {}

type MakeEdit = (edit: (range: core.Range) => JsonNode | undefined) => void

interface Props {
	node: JsonNode | undefined
	makeEdit: MakeEdit
	ctx: McdocContext
}
export function McdocRoot({ node, makeEdit, ctx } : Props) {
	const type = node?.typeDef ?? { kind: 'unsafe' }

	if (type.kind === 'struct') {
		return <StructBody type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
	}

	return <>
		<div class="node-header">
			<Head type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
		</div>
		<Body type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
	</>
}

interface HeadProps extends Props {
	type: SimplifiedMcdocType
	optional?: boolean
}
function Head({ type, optional, node, makeEdit, ctx }: HeadProps) {
	const { locale } = useLocale()
	if (type.kind === 'string') {
		return <StringHead type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'enum') {
		return <EnumHead type={type} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'byte' || type.kind === 'short' || type.kind === 'int' || type.kind === 'long' || type.kind === 'float' || type.kind === 'double') {
		return <NumericHead type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'boolean') {
		return <BooleanHead node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'union') {
		return <UnionHead type={type} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'struct' && optional) {
		if (node && JsonObjectNode.is(node)) {
			return <button class="node-collapse open tooltipped tip-se" aria-label={locale('remove')}>
				{Octicon.trashcan}
			</button>
		} else {
			return <button class="node-collapse closed tooltipped tip-se" aria-label={locale('expand')}>
				{Octicon.plus_circle}
			</button>
		}
	}
	if (type.kind === 'list' || type.kind === 'byte_array' || type.kind === 'int_array' || type.kind === 'long_array') {
		return <ListHead type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	// console.warn('Unhandled head', type)
	return <></>
}

interface StringHeadProps extends Props {
	type: StringType
}
function StringHead({ type, node, makeEdit, ctx }: StringHeadProps) {
	const value = JsonStringNode.is(node) ? node.value : undefined

	const onChangeValue = useCallback((newValue: string) => {
		if (value === newValue) {
			return
		}
		makeEdit((range) => {
			if (newValue.length === 0) {
				return undefined
			}
			return {
				type: 'json:string',
				range,
				options: json.parser.JsonStringOptions,
				value: newValue,
				valueMap: [{ inner: core.Range.create(0), outer: core.Range.create(range.start) }],
			}
		})
	}, [node, makeEdit])

	const completions = useMemo(() => {
		return getValues(type, { ...ctx, offset: node?.range.start ?? 0 })
			.filter(c => c.kind === 'string')
	}, [type, node, ctx])

	const datalistId = `mcdoc_completions_${hexId()}`

	return <>
		{completions && <datalist id={datalistId}>
			{completions.map(c => <option>{c.value}</option>)}
		</datalist>}
		<input value={value} onInput={(e) => onChangeValue((e.target as HTMLInputElement).value)} list={completions ? datalistId : undefined} />
	</>
}

interface EnumHeadProps extends HeadProps {
	type: SimplifiedEnum,
}
function EnumHead({ type, optional, node, makeEdit }: EnumHeadProps) {
	const value = JsonStringNode.is(node) ? node.value : undefined

	const onChangeValue = useCallback((newValue: string) => {
		if (value === newValue) {
			return
		}
		makeEdit((range) => {
			if (newValue === '__unset__') {
				return undefined
			}
			if (type.enumKind === 'string') {
				return {
					type: 'json:string',
					range,
					options: json.parser.JsonStringOptions,
					value: newValue,
					valueMap: [{ inner: core.Range.create(0), outer: core.Range.create(range.start) }],
				}
			}
			const number: core.FloatNode = {
				type: 'float',
				range,
				value: parseFloat(newValue),
			}
			const result: JsonNumberNode = {
				type: 'json:number',
				range,
				children: [number],
				value: number,
			}
			number.parent = result
			return result
		})
	}, [type.enumKind, value, makeEdit])

	return <select value={value} onInput={(e) => onChangeValue((e.target as HTMLSelectElement).value)}>
		{(value === undefined || optional) && <option value="__unset__">-- unset --</option>}
		{type.values.map(value =>
			<option value={value.value}>{value.value}</option>
		)}
	</select>
}

interface NumericHeadProps extends Props {
	type: NumericType,
}
function NumericHead({ type, node, makeEdit }: NumericHeadProps) {
	const value = node && JsonNumberNode.is(node) ? Number(node.value.value) : undefined

	const isFloat = type.kind === 'float' || type.kind === 'double'

	const onChangeValue = useCallback((value: string) => {
		const number = value.length === 0 ? undefined : Number(value)
		if (number !== undefined && Number.isNaN(number)) {
			return
		}
		makeEdit((range) => {
			if (number === undefined) {
				return undefined
			}
			const newValue: core.FloatNode | core.LongNode = isFloat
				? { type: 'float', range, value: number }
				: { type: 'long', range, value: BigInt(number) }
			const newNode: JsonNumberNode = {
				type: 'json:number',
				range,
				value: newValue,
				children: [newValue],
			}
			newValue.parent = newNode
			return newNode
		})
	}, [isFloat, node, makeEdit])

	return <input type="number" value={value} onInput={(e) => onChangeValue((e.target as HTMLInputElement).value)} />
}

function BooleanHead({ node, makeEdit }: Props) {
	const value = node && JsonBooleanNode.is(node) ? node.value : undefined

	const onSelect = useCallback((newValue: boolean) => {
		makeEdit((range) => {
			if (value === newValue) {
				return undefined
			}
			return {
				type: 'json:boolean',
				range,
				value: newValue,
			}
		})
	}, [node, makeEdit, value]) 

	return <>
		<button class={value === false ? 'selected' : ''} onClick={() => onSelect(false)}>False</button>
		<button class={value === true ? 'selected' : ''} onClick={() => onSelect(true)}>True</button>
	</>
}

interface UnionHeadProps extends HeadProps {
	type: UnionType<SimplifiedMcdocTypeNoUnion>
}
function UnionHead({ type, optional, node, makeEdit, ctx }: UnionHeadProps) {
	const selectedType = node?.typeDef

	const onSelect = useCallback((newValue: string) => {
		makeEdit((range) => {
			if (newValue === '__unset__') {
				return undefined
			}
			const newSelected = type.members[parseInt(newValue)]
			return getDefault(newSelected, range, ctx)
		})
	}, [type, makeEdit, ctx])

	const memberIndex = selectedType ? type.members.findIndex(m => quickEqualTypes(m, selectedType)) : -1

	return <>
		<select value={memberIndex > -1 ? memberIndex : '__unset__'} onInput={(e) => onSelect((e.target as HTMLSelectElement).value)}>
			{optional && <option value="__unset__">-- unset --</option>}
			{type.members.map((member, index) =>
				<option value={index}>{member.kind}</option>
			)}
		</select>
		{(selectedType || !optional) && <Head type={selectedType ?? type.members[0]} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />}
	</>
}

interface ListHeadProps extends Props {
	type: ListType | PrimitiveArrayType,
}
function ListHead({ type, node, makeEdit, ctx }: ListHeadProps) {
	const { locale } = useLocale()

	const fixedRange = type.lengthRange?.min !== undefined && type.lengthRange.min === type.lengthRange.max
	if (fixedRange) {
		return <></>
	}

	const canAdd = (type.lengthRange?.max ?? Infinity) > (node?.children?.length ?? 0)

	const onAdd = useCallback(() => {
		if (canAdd) {
			makeEdit((range) => {
				const itemType = getItemType(type, ctx)
				const newValue = getDefault(itemType, range, ctx)
				const newItem: core.ItemNode<JsonNode> = {
					type: 'item',
					range,
					children: [newValue],
					value: newValue,
				}
				newValue.parent = newItem
				if (JsonArrayNode.is(node)) {
					node.children.push(newItem)
					newItem.parent = node
					return node
				}
				const newArray: JsonArrayNode = {
					type: 'json:array',
					range,
					children: [newItem],
				}
				newItem.parent = newArray
				return newArray
			})
		}
	}, [type, node, makeEdit, ctx, canAdd])

	return <button class="add tooltipped tip-se" aria-label={locale('add_top')} onClick={() => onAdd()} disabled={!canAdd}>
		{Octicon.plus_circle}
	</button>
}

interface BodyProps extends Props {
	type: SimplifiedMcdocType
	optional?: boolean
}
function Body({ type, optional, node, makeEdit, ctx }: BodyProps) {
	if (type.kind === 'union') {
		return <UnionBody type={type} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'struct') {
		if (type.fields.length === 0) {
			return <></>
		}
		return <div class="node-body">
			<StructBody type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
		</div>
	}
	if (type.kind === 'list' || type.kind === 'byte_array' || type.kind === 'int_array' || type.kind === 'long_array') {
		const fixedRange = type.lengthRange?.min !== undefined && type.lengthRange.min === type.lengthRange.max
		if (!fixedRange && (!node || node.children?.length === 0)) {
			return <></>
		}
		return <div class="node-body">
			<ListBody type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
		</div>
	}
	if (type.kind === 'byte' || type.kind === 'short' || type.kind === 'int' || type.kind === 'boolean') {
		return <></>
	}
	// console.warn('Unhandled body', type, node)
	return <></>
}

interface UnionBodyProps extends BodyProps {
	type: UnionType<SimplifiedMcdocTypeNoUnion>
}
function UnionBody({ type, optional, node, makeEdit, ctx }: UnionBodyProps) {
	const selectedType = node?.typeDef
	if (!selectedType && optional) {
		return <></>
	}
	return <Body type={selectedType ?? type.members[0]} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
}

interface StructBodyProps extends Props {
	type: SimplifiedStructType
}
function StructBody({ type: outerType, node, makeEdit, ctx }: StructBodyProps) {
	if (!JsonObjectNode.is(node)) {
		return <></>
	}
	const type = node.typeDef?.kind === 'struct' ? node.typeDef : outerType
	const staticFields = type.fields.filter(field =>
		field.key.kind === 'literal' && field.key.value.kind === 'string')
	const dynamicFields = type.fields.filter(field =>
		field.key.kind === 'string')
	if (type.fields.length !== staticFields.length + dynamicFields.length) {
		// console.warn('Missed struct fields', type.fields.filter(field =>
		// 	!staticFields.includes(field) && !dynamicFields.includes(field)))
	}
	return <>
		{staticFields.map(field => {
			const key = (field.key as LiteralType).value.value.toString()
			const childIndex = node.children.findIndex(p => p.key?.value === key)
			const child = childIndex === -1 ? undefined : node.children[childIndex]
			const childValue = child?.value
			const fieldType = simplifyType(field.type, ctx)
			const makeFieldEdit: MakeEdit = (edit) => {
				if (child) {
					makeEdit(() => {
						const newChild = edit(childValue?.range ?? core.Range.create(child.range.end))
						if (newChild === undefined) {
							node.children.splice(childIndex, 1)
						} else {
							node.children[childIndex] = {
								type: 'pair',
								range: child.range,
								key: child.key,
								value: newChild,
							}
						}
						return node
					})
				} else {
					const newChild = edit(core.Range.create(node.range.end))
					if (newChild) {
						makeEdit(() => {
							node.children.push({
								type: 'pair',
								range: newChild.range,
								key: {
									type: 'json:string',
									range: newChild.range,
									options: json.parser.JsonStringOptions,
									value: key,
									valueMap: [{ inner: core.Range.create(0), outer: newChild.range }],
								},
								value: newChild,
							})
							return node
						})
					}
				}
			}
			return <div class="node">
				<div class="node-header">
					<Key label={key} />
					<Head type={fieldType} node={childValue} optional={field.optional} makeEdit={makeFieldEdit} ctx={ctx} />
				</div>
				<Body type={fieldType} node={childValue} optional={field.optional} makeEdit={makeFieldEdit} ctx={ctx} />
			</div>
		})}
	</>
}

function Key({ label }: { label: string | number | boolean }) {
	const formatted = label.toString().replaceAll('_', ' ')
	const captizalized = formatted.charAt(0).toUpperCase() + formatted.substring(1)
	return <label>{captizalized}</label>
}

interface ListBodyProps extends Props {
	type: ListType | PrimitiveArrayType
}
function ListBody({ type: outerType, node, makeEdit, ctx }: ListBodyProps) {
	const { locale } = useLocale()
	if (!JsonArrayNode.is(node)) {
		return <></>
	}
	const type = (node.typeDef?.kind === 'list' || node.typeDef?.kind === 'byte_array' || node.typeDef?.kind === 'int_array' || node.typeDef?.kind === 'long_array') ? node.typeDef : outerType
	const onRemoveItem = useCallback((index: number) => {
		makeEdit(() => {
			node.children.splice(index, 1)
			return node
		})
	}, [makeEdit, node])
	return <>
		{node.children.map((item, index) => {
			const child = item.value
			const itemType = getItemType(type, ctx)
			const makeItemEdit: MakeEdit = (edit) => {
				makeEdit(() => {
					const newChild = edit(child?.range ?? item.range)
					node.children[index] = {
						type: 'item',
						range: item.range,
						value: newChild,
					}
					return node
				})
			}
			return <div class="node">
				<div class="node-header">
					<button class="remove tooltipped tip-se" aria-label={locale('remove')} onClick={() => onRemoveItem(index)}>
						{Octicon.trashcan}
					</button>
					{node.children.length > 1 && <div class="node-move">
						<button class="move tooltipped tip-se" aria-label={locale('move_up')} disabled={index === 0}>
							{Octicon.chevron_up}
						</button>
						<button class="move tooltipped tip-se" aria-label={locale('move_down')} disabled={index === node.children.length - 1}>
							{Octicon.chevron_down}
						</button>
					</div>}
					<Key label="entry" />
					<Head type={itemType} node={child} makeEdit={makeItemEdit} ctx={ctx} />
				</div>
				<Body type={itemType} node={child} makeEdit={makeItemEdit} ctx={ctx} />
			</div>
		})}
	</>
}

function getDefault(type: McdocType, range: core.Range, ctx: McdocContext): JsonNode {
	if (type.kind === 'string') {
		return JsonStringNode.mock(range)
	}
	if (type.kind === 'boolean') {
		return { type: 'json:boolean', range, value: false }
	}
	if (type.kind === 'byte' || type.kind === 'short' || type.kind === 'int' || type.kind === 'long' || type.kind === 'float' || type.kind === 'double') {
		const value: core.LongNode = { type: 'long', range, value: BigInt(0) }
		return { type: 'json:number', range, value, children: [value] }
	}
	if (type.kind === 'struct' || type.kind === 'any' || type.kind === 'unsafe') {
		return JsonObjectNode.mock(range)
	}
	if (type.kind === 'list' || type.kind === 'byte_array' || type.kind === 'int_array' || type.kind === 'long_array') {
		return JsonArrayNode.mock(range)
	}
	if (type.kind === 'tuple') {
		return {
			type: 'json:array',
			range,
			children: type.items.map(item => {
				const valueNode = getDefault(item, range, ctx)
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
		return getDefault(type.members[0], range, ctx)
	}
	if (type.kind === 'enum') {
		return getDefault({ kind: 'literal', value: { kind: type.enumKind ?? 'string', value: type.values[0].value } as any }, range, ctx)
	}
	if (type.kind === 'literal') {
		if (type.value.kind === 'string') {
			return { type: 'json:string', range, options: json.parser.JsonStringOptions, value: type.value.value, valueMap: [{ inner: core.Range.create(0), outer: core.Range.create(range.start) }] }
		}
		if (type.value.kind === 'boolean') {
			return { type: 'json:boolean', range, value: type.value.value }
		}
		const value: core.FloatNode | core.LongNode = type.value.kind === 'float' || type.value.kind === 'double'
			? { type: 'float', range, value: type.value.value }
			: { type: 'long', range, value: BigInt(type.value.value) }
		return { type: 'json:number', range, value, children: [value] }
	}
	if (type.kind === 'reference') {
		if (!type.path) {
			return { type: 'json:null', range }
		}
		const symbol = ctx.symbols.query(ctx.doc, 'mcdoc', type.path)
		const def = symbol.getData(TypeDefSymbolData.is)?.typeDef
		if (!def) {
			return { type: 'json:null', range }
		}
		if (type.attributes?.length) {
			return getDefault({
				...def,
				attributes: [...type.attributes, ...def.attributes ?? []],
			}, range, ctx)
		}
		return getDefault(def, range, ctx)
	}
	return { type: 'json:null', range }
}

function simplifyType(type: McdocType, ctx: McdocContext): SimplifiedMcdocType {
	const node: SimplifyValueNode<any> = {
		entryNode: {
			parent: undefined,
			runtimeKey: undefined,
		},
		node: {
			originalNode: null,
			inferredType: { kind: 'any' },
		},
	}
	const context: McdocCheckerContext<any> = { 
		...ctx,
		allowMissingKeys: false,
		requireCanonical: false,
		isEquivalent: () => false,
		getChildren: () => [],
		reportError: () => {},
		attachTypeInfo: () => {},
		nodeAttacher:  () => {},
		stringAttacher:  () => {},
	}
	const result = simplify(type, { node, ctx: context })
	return result.typeDef
}

function getItemType(type: ListType | PrimitiveArrayType, ctx: McdocContext): SimplifiedMcdocType {
	return type.kind === 'list' ? simplifyType(type.item, ctx)
		: type.kind === 'byte_array' ? { kind: 'byte' }
			: type.kind === 'int_array' ? { kind: 'int' }
				: type.kind === 'long_array' ? { kind: 'long' }
					: { kind: 'any' }
}

function quickEqualTypes(a: SimplifiedMcdocType, b: SimplifiedMcdocType) {
	if (a.kind !== b.kind) {
		return false
	}
	// TODO: improve this
	return true
}

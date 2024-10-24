import * as core from '@spyglassmc/core'
import type { JsonNode } from '@spyglassmc/json'
import * as json from '@spyglassmc/json'
import { JsonArrayNode, JsonBooleanNode, JsonNumberNode, JsonObjectNode, JsonStringNode } from '@spyglassmc/json'
import type { ListType, LiteralType, McdocType, NumericType, PrimitiveArrayType, StringType, TupleType, UnionType } from '@spyglassmc/mcdoc'
import { TypeDefSymbolData } from '@spyglassmc/mcdoc/lib/binder/index.js'
import type { McdocCheckerContext, SimplifiedEnum, SimplifiedMcdocType, SimplifiedMcdocTypeNoUnion, SimplifiedStructType, SimplifyValueNode } from '@spyglassmc/mcdoc/lib/runtime/checker/index.js'
import { simplify } from '@spyglassmc/mcdoc/lib/runtime/checker/index.js'
import { getValues } from '@spyglassmc/mcdoc/lib/runtime/completer/index.js'
import { useCallback, useMemo } from 'preact/hooks'
import { useLocale } from '../../contexts/Locale.jsx'
import { generateColor, hexId } from '../../Utils.js'
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
	if (type.kind === 'struct') {
		return <StructHead type={type} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'list' || type.kind === 'byte_array' || type.kind === 'int_array' || type.kind === 'long_array') {
		return <ListHead type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'tuple') {
		return <></>
	}
	if (type.kind === 'literal') {
		return <LiteralHead type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	return <></>
}

interface StringHeadProps extends Props {
	type: StringType
}
function StringHead({ type, node, makeEdit, ctx }: StringHeadProps) {
	const { locale } = useLocale()

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

	const color = type.attributes?.find(a => a.name === 'color')?.value
	const colorKind = color?.kind === 'literal' && color.value.kind === 'string' ? color.value.value : undefined

	const onRandomColor = useCallback(() => {
		const color = generateColor()
		onChangeValue('#' + (color.toString(16).padStart(6, '0') ?? '000000'))
	}, [onChangeValue])

	return <>
		{completions.length > 0 && <datalist id={datalistId}>
			{completions.map(c => <option>{c.value}</option>)}
		</datalist>}
		<input class={colorKind === 'hex_rgb' ? 'short-input' : ''} value={value} onInput={(e) => onChangeValue((e.target as HTMLInputElement).value)} list={completions.length > 0 ? datalistId : undefined} />
		{colorKind === 'hex_rgb' && <>
			<input class="short-input" type="color" value={value} onChange={(e) => onChangeValue((e.target as HTMLInputElement).value)} />
			<button class="tooltipped tip-se" aria-label={locale('generate_new_color')} onClick={onRandomColor}>{Octicon.sync}</button>
		</>}
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
	const { locale } = useLocale()

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

	const color = type.attributes?.find(a => a.name === 'color')?.value
	const colorKind = color?.kind === 'literal' && color.value.kind === 'string' ? color.value.value : undefined

	const onChangeColor = useCallback((value: string) => {
		onChangeValue(parseInt(value.slice(1), 16).toString())
	}, [onChangeValue])

	const onRandomColor = useCallback(() => {
		onChangeValue(generateColor().toString())
	}, [onChangeValue])

	return <>
		<input class="short-input" type="number" value={value} onInput={(e) => onChangeValue((e.target as HTMLInputElement).value)} />
		{colorKind && <>
			<input class="short-input" type="color" value={'#' + (value?.toString(16).padStart(6, '0') ?? '000000')} onChange={(e) => onChangeColor((e.target as HTMLInputElement).value)} />
			<button class="tooltipped tip-se" aria-label={locale('generate_new_color')} onClick={onRandomColor}>{Octicon.sync}</button>
		</>}
	</>
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
	const selectedType = findSelectedMember(type, node)

	const onSelect = useCallback((newValue: string) => {
		makeEdit((range) => {
			if (newValue === '__unset__') {
				return undefined
			}
			const newSelected = type.members[parseInt(newValue)]
			return getDefault(newSelected, range, ctx)
		})
	}, [type, makeEdit, ctx])

	const memberIndex = type.members.findIndex(m => quickEqualTypes(m, selectedType))

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

function StructHead({ type, optional, node, makeEdit, ctx }: HeadProps) {
	const { locale } = useLocale()

	const onRemove = useCallback(() => {
		makeEdit(() => {
			return undefined
		})
	}, [makeEdit])

	const onSetDefault = useCallback(() => {
		makeEdit((range) => {
			return getDefault(type, range, ctx)
		})
	}, [type, ctx])

	if (optional) {
		if (node && JsonObjectNode.is(node)) {
			return <button class="node-collapse open tooltipped tip-se" aria-label={locale('remove')} onClick={onRemove}>
				{Octicon.trashcan}
			</button>
		} else {
			return <button class="node-collapse closed tooltipped tip-se" aria-label={locale('expand')} onClick={onSetDefault}>
				{Octicon.plus_circle}
			</button>
		}
	} else {
		if (!node || !JsonObjectNode.is(node)) {
			return <button class="add tooltipped tip-se" aria-label={locale('reset')} onClick={onSetDefault}>{Octicon.history}</button>
		}
		return <></>
	}
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
				const itemType = simplifyType(getItemType(type), ctx)
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

interface LiteralHeadProps extends HeadProps {
	type: LiteralType
}
function LiteralHead({ type }: LiteralHeadProps) {
	return <input value={type.value.value.toString()} disabled />
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
		if (optional && !node) {
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
	if (type.kind === 'tuple') {
		return <div class="node-body">
			<TupleBody type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
		</div>
	}
	if (type.kind === 'boolean' || type.kind === 'byte' || type.kind === 'short' || type.kind === 'int' || type.kind === 'float' || type.kind === 'double') {
		return <></>
	}
	// console.warn('Unhandled body', type, node)
	return <></>
}

interface UnionBodyProps extends BodyProps {
	type: UnionType<SimplifiedMcdocTypeNoUnion>
}
function UnionBody({ type, optional, node, makeEdit, ctx }: UnionBodyProps) {
	const selectedType = findSelectedMember(type, node)
	return <Body type={selectedType} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
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
			const itemType = simplifyType(getItemType(type), ctx)
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

interface TupleBodyProps extends BodyProps{
	type: TupleType
}
function TupleBody({ type, node, makeEdit, ctx }: TupleBodyProps) {
	if (!JsonArrayNode.is(node)) {
		return <></>
	}
	return <>
		{type.items.map((item, index) => {
			const child = node?.children?.[index]?.value
			const itemType = simplifyType(item, ctx)
			const makeItemEdit: MakeEdit = (edit) => {
				makeEdit(() => {
					const newChild = edit(child?.range ?? node.range)
					if (newChild === undefined) {
						return node
					}
					node.children[index] = {
						type: 'item',
						range: newChild.range,
						value: newChild,
					}
					return node
				})
			}
			return <div class="node">
				<div class="node-header">
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
		const object = JsonObjectNode.mock(range)
		if (type.kind === 'struct') {
			for (const field of type.fields) {
				if (field.kind === 'pair' && !field.optional && typeof field.key === 'string') {
					const key: JsonStringNode = { type: 'json:string', range, options: json.parser.JsonStringOptions, value: field.key, valueMap: [{ inner: core.Range.create(0), outer: core.Range.create(range.start) }] }
					const value = getDefault(field.type, range, ctx)
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
	if (type.kind === 'list' || type.kind === 'byte_array' || type.kind === 'int_array' || type.kind === 'long_array') {
		const array = JsonArrayNode.mock(range)
		const minLength = type.lengthRange?.min ?? 0
		if (minLength > 0) {
			for (let i = 0; i < minLength; i += 1) {
				const child = getDefault(getItemType(type), range, ctx)
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

function getItemType(type: ListType | PrimitiveArrayType): McdocType {
	return type.kind === 'list' ? type.item
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

function findSelectedMember(union: UnionType<SimplifiedMcdocTypeNoUnion>, node: JsonNode | undefined) {
	const selectedType = node?.typeDef
	if (!selectedType) {
		return union.members[0]
	}
	if (selectedType.kind === 'union') {
		// The node technically matches all members of this union,
		// ideally the editor should show a combination of all members
		return selectedType.members[0]
	}
	return selectedType
}

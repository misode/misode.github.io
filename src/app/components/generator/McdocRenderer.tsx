import * as core from '@spyglassmc/core'
import type { JsonNode } from '@spyglassmc/json'
import * as json from '@spyglassmc/json'
import { JsonArrayNode, JsonBooleanNode, JsonNumberNode, JsonObjectNode, JsonStringNode } from '@spyglassmc/json'
import type { ListType, LiteralType, McdocType, NumericType, PrimitiveArrayType } from '@spyglassmc/mcdoc'
import { TypeDefSymbolData } from '@spyglassmc/mcdoc/lib/binder/index.js'
import type { SimplifiedStructType } from '@spyglassmc/mcdoc/lib/runtime/checker/index.js'
import { useCallback } from 'preact/hooks'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import { useLocale } from '../../contexts/Locale.jsx'
import { Octicon } from '../Octicon.jsx'

export interface McdocContext {
	doc: TextDocument,
	symbols: core.SymbolUtil,
}

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
			<Head simpleType={type} node={node} makeEdit={makeEdit} ctx={ctx} />
		</div>
		<Body simpleType={type} node={node} makeEdit={makeEdit} ctx={ctx} />
	</>
}

interface HeadProps extends Props {
	simpleType: McdocType
	optional?: boolean
}
function Head({ simpleType, optional, node, makeEdit, ctx }: HeadProps) {
	const { locale } = useLocale()
	const type = node?.typeDef ?? simpleType
	if (type.kind === 'string') {
		return <StringHead node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'enum') {
		const value = JsonStringNode.is(node) ? node.value : undefined
		return <select value={value}>
			{optional && <option value={undefined}>-- select --</option>}
			{type.values.map(value =>
				<option value={value.value}>{value.value}</option>
			)}
		</select>
	}
	if (type.kind === 'byte' || type.kind === 'short' || type.kind === 'int' || type.kind === 'long' || type.kind === 'float' || type.kind === 'double') {
		return <NumericHead type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'boolean') {
		return <BooleanHead node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'union') {
		return <select>
			{type.members.map((member, index) => {
				<option value={index}>{member.kind}</option>
			})}
		</select>
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

function StringHead({ node, makeEdit }: Props) {
	const value = JsonStringNode.is(node) ? node.value : undefined

	const onChangeValue = useCallback((value: string) => {
		makeEdit((range) => {
			if (value.length === 0) {
				return undefined
			}
			return {
				type: 'json:string',
				range,
				options: json.parser.JsonStringOptions,
				value: value,
				valueMap: [{ inner: core.Range.create(0), outer: core.Range.create(range.start) }],
			}
		})
	}, [node, makeEdit])

	return <input value={value} onInput={(e) => onChangeValue((e.target as HTMLInputElement).value)} />
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
				const itemType: McdocType = type.kind === 'list' ? type.item
					: type.kind === 'byte_array' ? { kind: 'byte' }
						: type.kind === 'int_array' ? { kind: 'int' }
							: type.kind === 'long_array' ? { kind: 'long' }
								: { kind: 'any' }
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
	}, [type, node, makeEdit, canAdd])

	return <button class="add tooltipped tip-se" aria-label={locale('add_top')} onClick={() => onAdd()} disabled={!canAdd}>
		{Octicon.plus_circle}
	</button>
}

interface BodyProps extends Props {
	simpleType: McdocType
}
function Body({ simpleType, node, makeEdit, ctx }: BodyProps) {
	const type = node?.typeDef ?? simpleType
	if (node?.typeDef?.kind === 'struct') {
		if (node.typeDef.fields.length === 0) {
			return <></>
		}
		return <div class="node-body">
			<StructBody type={node.typeDef} node={node} makeEdit={makeEdit} ctx={ctx} />
		</div>
	}
	if (node?.typeDef?.kind === 'list') {
		const fixedRange = node.typeDef.lengthRange?.min !== undefined && node.typeDef.lengthRange.min === node.typeDef.lengthRange.max
		if (!fixedRange && node.children?.length === 0) {
			return <></>
		}
		return <div class="node-body">
			<ListBody type={node.typeDef} node={node} makeEdit={makeEdit} ctx={ctx} />
		</div>
	}
	if (type.kind === 'byte' || type.kind === 'short' || type.kind === 'int' || type.kind === 'boolean') {
		return <></>
	}
	// console.warn('Unhandled body', type, node)
	return <></>
}

interface StructBodyProps extends Props {
	type: SimplifiedStructType
}
function StructBody({ type, node, makeEdit, ctx }: StructBodyProps) {
	if (!JsonObjectNode.is(node)) {
		return <></>
	}
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
					<Head simpleType={field.type} node={childValue} optional={field.optional} makeEdit={makeFieldEdit} ctx={ctx} />
				</div>
				<Body simpleType={field.type} node={childValue} makeEdit={makeFieldEdit} ctx={ctx} />
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
	type: ListType
}
function ListBody({ type, node, makeEdit, ctx }: ListBodyProps) {
	const { locale } = useLocale()
	if (!JsonArrayNode.is(node)) {
		return <></>
	}
	const onRemoveItem = useCallback((index: number) => {
		makeEdit(() => {
			node.children.splice(index, 1)
			return node
		})
	}, [makeEdit, node])
	return <>
		{node.children.map((item, index) => {
			const child = item.value
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
					<Head simpleType={type.item} node={child} makeEdit={makeItemEdit} ctx={ctx} />
				</div>
				<Body simpleType={type.item} node={child} makeEdit={makeItemEdit} ctx={ctx} />
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

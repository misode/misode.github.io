import * as core from '@spyglassmc/core'
import type { JsonNode } from '@spyglassmc/json'
import * as json from '@spyglassmc/json'
import { JsonArrayNode, JsonBooleanNode, JsonNumberNode, JsonObjectNode, JsonStringNode } from '@spyglassmc/json'
import type { ListType, LiteralType, McdocType, NumericType } from '@spyglassmc/mcdoc'
import type { SimplifiedStructType } from '@spyglassmc/mcdoc/lib/runtime/checker/index.js'
import { useCallback } from 'preact/hooks'
import { useLocale } from '../../contexts/Locale.jsx'
import type { AstEdit } from '../../services/Spyglass.js'
import { Octicon } from '../Octicon.jsx'

interface Props {
	node: JsonNode | undefined
	makeEdit: (edit: AstEdit) => void
}
export function McdocRoot({ node, makeEdit } : Props) {
	const type = node?.typeDef ?? { kind: 'unsafe' }

	if (type.kind === 'struct') {
		return <StructBody type={type} node={node} makeEdit={makeEdit} />
	}

	return <>
		<div class="node-header">
			<Head simpleType={type} node={node} makeEdit={makeEdit} />
		</div>
		<Body simpleType={type} node={node} makeEdit={makeEdit} />
	</>
}

interface HeadProps extends Props {
	simpleType: McdocType
	optional?: boolean
}
function Head({ simpleType, optional, node, makeEdit }: HeadProps) {
	const { locale } = useLocale()
	const type = node?.typeDef ?? simpleType
	if (type.kind === 'string') {
		return <StringHead node={node} makeEdit={makeEdit} />
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
		return <NumericHead type={type} node={node} makeEdit={makeEdit} />
	}
	if (type.kind === 'boolean') {
		return <BooleanHead node={node} makeEdit={makeEdit} />
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
		const fixedRange = type.lengthRange?.min !== undefined && type.lengthRange.min === type.lengthRange.max
		if (fixedRange) {
			return <></>
		}
		return <button class="add tooltipped tip-se" aria-label={locale('add_top')}>
			{Octicon.plus_circle}
		</button>
	}
	// console.warn('Unhandled head', type)
	return <></>
}

function StringHead({ node, makeEdit }: Props) {
	const value = JsonStringNode.is(node) ? node.value : undefined

	const onChangeValue = useCallback((value: string) => {
		makeEdit(() => {
			replaceNode(node, (range, parent) => {
				const newNode: JsonStringNode = {
					type: 'json:string',
					range,
					options: json.parser.JsonStringOptions,
					value: value,
					valueMap: [{ inner: core.Range.create(0), outer: core.Range.create(range.start) }],
					parent,
				}
				return newNode
			})
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
		makeEdit(() => {
			if (number === undefined) {
				removeNode(node)
				return
			}
			replaceNode(node, (range, parent) => {
				const newValue: core.FloatNode | core.LongNode = isFloat
					? { type: 'float', range, value: number }
					: { type: 'long', range, value: BigInt(number) }
				const newNode: JsonNumberNode = {
					type: 'json:number',
					range,
					value: newValue,
					children: [newValue],
					parent,
				}
				newValue.parent = newNode
				return newNode
			})
		})
	}, [isFloat, node, makeEdit])

	return <input type="number" value={value} onInput={(e) => onChangeValue((e.target as HTMLInputElement).value)} />
}

function BooleanHead({ node, makeEdit }: Props) {
	const value = node && JsonBooleanNode.is(node) ? node.value : undefined

	const onSelect = useCallback((newValue: boolean) => {
		makeEdit(() => {
			if (value === newValue) {
				removeNode(node)
			} else {
				replaceNode(node, (range, parent) => {
					const newNode: JsonBooleanNode = {
						type: 'json:boolean',
						range,
						value: newValue,
						parent,
					}
					return newNode
				})
			}
		})
	}, [node, makeEdit, value]) 

	return <>
		<button class={value === false ? 'selected' : ''} onClick={() => onSelect(false)}>False</button>
		<button class={value === true ? 'selected' : ''} onClick={() => onSelect(true)}>True</button>
	</>
}

interface BodyProps extends Props {
	simpleType: McdocType
}
function Body({ simpleType, node, makeEdit }: BodyProps) {
	const type = node?.typeDef ?? simpleType
	if (node?.typeDef?.kind === 'struct') {
		if (node.typeDef.fields.length === 0) {
			return <></>
		}
		return <div class="node-body">
			<StructBody type={node.typeDef} node={node} makeEdit={makeEdit} />
		</div>
	}
	if (node?.typeDef?.kind === 'list') {
		const fixedRange = node.typeDef.lengthRange?.min !== undefined && node.typeDef.lengthRange.min === node.typeDef.lengthRange.max
		if (!fixedRange && node.children?.length === 0) {
			return <></>
		}
		return <div class="node-body">
			<ListBody type={node.typeDef} node={node} makeEdit={makeEdit} />
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
function StructBody({ type, node, makeEdit }: StructBodyProps) {
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
			const key = (field.key as LiteralType).value.value
			const child = node.children.find(p => p.key?.value === key)?.value
			return <div class="node">
				<div class="node-header">
					<Key label={key} />
					<Head simpleType={field.type} node={child} optional={field.optional} makeEdit={makeEdit} />
				</div>
				<Body simpleType={field.type} node={child} makeEdit={makeEdit} />
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
function ListBody({ type, node, makeEdit }: ListBodyProps) {
	const { locale } = useLocale()
	if (!JsonArrayNode.is(node)) {
		return <></>
	}
	const onRemoveItem = useCallback((index: number) => {
		makeEdit(() => {
			node.children.splice(index, 1)
		})
	}, [makeEdit, node])
	return <>
		{node.children.map((item, index) => {
			const child = item.value
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
					<Head simpleType={type.item} node={child} makeEdit={makeEdit} />
				</div>
				<Body simpleType={type.item} node={child} makeEdit={makeEdit} />
			</div>
		})}
	</>
}

function replaceNode<T extends core.AstNode>(node: T | undefined, getNewNode: (range: core.Range, parent: core.AstNode) => T) {
	if (node !== undefined && node.parent?.children) {
		const index = node.parent.children.findIndex(c => c === node)
		if (index !== -1) {
			const newNode = getNewNode(node.range, node.parent)
			node.parent.children[index] = newNode
			if (core.PairNode.is(node.parent)) {
				;(node.parent as core.Mutable<core.PairNode<core.AstNode, core.AstNode>>).value = newNode
			}
		}
	}
}

function removeNode<T extends core.AstNode>(node: T | undefined) {
	if (node !== undefined && node.parent?.children) {
		if (core.PairNode.is(node.parent)) {
			removeNode(node.parent)
		} else {
			const index = node.parent.children.findIndex(c => c === node)
			node.parent.children.splice(index, 1)
		}
	}
}

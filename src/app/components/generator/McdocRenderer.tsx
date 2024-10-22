import type { JsonNode } from '@spyglassmc/json'
import { JsonArrayNode, JsonBooleanNode, JsonNumberNode, JsonObjectNode, JsonStringNode } from '@spyglassmc/json'
import type { ListType, LiteralType, McdocType } from '@spyglassmc/mcdoc'
import type { SimplifiedStructType } from '@spyglassmc/mcdoc/lib/runtime/checker/index.js'
import { useLocale } from '../../contexts/Locale.jsx'
import { Octicon } from '../Octicon.jsx'

interface Props {
	node: JsonNode | undefined
}
export function McdocRoot({ node } : Props) {
	const type = node?.typeDef ?? { kind: 'unsafe' }

	if (type.kind === 'struct') {
		return <StructBody type={type} node={node} />
	}

	return <>
		<div class="node-header">
			<Head simpleType={type} node={node} />
		</div>
		<Body simpleType={type} node={node} />
	</>
}

interface HeadProps extends Props {
	simpleType: McdocType
	optional?: boolean
}
function Head({ simpleType, optional, node }: HeadProps) {
	const { locale } = useLocale()
	const type = node?.typeDef ?? simpleType
	if (type.kind === 'string') {
		const value = JsonStringNode.is(node) ? node.value : undefined
		
		return <input value={value} />
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
		const value = node && JsonNumberNode.is(node) ? Number(node.value.value) : undefined
		return <input type="number" value={value} />
	}
	if (type.kind === 'boolean') {
		const value = node && JsonBooleanNode.is(node) ? node.value : undefined
		return <>
			<button class={value === false ? 'selected' : ''}>False</button>
			<button class={value === true ? 'selected' : ''}>True</button>
		</>
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

interface BodyProps extends Props {
	simpleType: McdocType
}
function Body({ simpleType, node }: BodyProps) {
	const type = node?.typeDef ?? simpleType
	if (node?.typeDef?.kind === 'struct') {
		if (node.typeDef.fields.length === 0) {
			return <></>
		}
		return <div class="node-body">
			<StructBody type={node.typeDef} node={node} />
		</div>
	}
	if (node?.typeDef?.kind === 'list') {
		return <div class="node-body">
			<ListBody type={node.typeDef} node={node} />
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
function StructBody({ type, node }: StructBodyProps) {
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
					<Head simpleType={field.type} node={child} optional={field.optional} />
				</div>
				<Body simpleType={field.type} node={child} />
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
function ListBody({ type, node }: ListBodyProps) {
	const { locale } = useLocale()
	if (!JsonArrayNode.is(node)) {
		return <></>
	}
	return <>
		{node.children.map((item, index) => {
			const child = item.value
			return <div class="node">
				<div class="node-header">
					<button class="remove tooltipped tip-se" aria-label={locale('remove')}>
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
					<Head simpleType={type.item} node={child} />
				</div>
				<Body simpleType={type.item} node={child} />
			</div>
		})}
	</>
}

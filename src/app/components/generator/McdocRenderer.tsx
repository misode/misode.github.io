import * as core from '@spyglassmc/core'
import type { JsonNode } from '@spyglassmc/json'
import * as json from '@spyglassmc/json'
import { JsonArrayNode, JsonBooleanNode, JsonNumberNode, JsonObjectNode, JsonStringNode } from '@spyglassmc/json'
import { localeQuote } from '@spyglassmc/locales'
import type { ListType, LiteralType, McdocType, NumericType, PrimitiveArrayType, StringType, TupleType, UnionType } from '@spyglassmc/mcdoc'
import type { McdocCheckerContext, SimplifiedEnum, SimplifiedMcdocType, SimplifiedMcdocTypeNoUnion, SimplifiedStructType, SimplifyValueNode } from '@spyglassmc/mcdoc/lib/runtime/checker/index.js'
import { simplify } from '@spyglassmc/mcdoc/lib/runtime/checker/index.js'
import { getValues } from '@spyglassmc/mcdoc/lib/runtime/completer/index.js'
import { Identifier, ItemStack } from 'deepslate'
import { useCallback, useMemo } from 'preact/hooks'
import config from '../../Config.js'
import { useLocale } from '../../contexts/Locale.jsx'
import { useFocus } from '../../hooks/useFocus.js'
import { generateColor, hexId } from '../../Utils.js'
import { ItemDisplay } from '../ItemDisplay.jsx'
import { Octicon } from '../Octicon.jsx'

const SPECIAL_UNSET = '__unset__'

export interface McdocContext extends core.CheckerContext {}

type MakeEdit = (edit: (range: core.Range) => JsonNode | undefined) => void

interface Props<Type extends SimplifiedMcdocType = SimplifiedMcdocType> {
	type: Type
	optional?: boolean
	node: JsonNode | undefined
	makeEdit: MakeEdit
	ctx: McdocContext
}
export function McdocRoot({ type, node, makeEdit, ctx } : Props) {
	const { locale } = useLocale()

	if (type.kind === 'struct' && type.fields.length > 0 && JsonObjectNode.is(node)) {
		return <StructBody type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
	}

	return <>
		<div class="node-header">
			<Errors type={type} node={node} ctx={ctx} />
			<Key label={locale('root')} />
			<Head type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
		</div>
		<Body type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
	</>
}

function Head({ type, optional, node, makeEdit, ctx }: Props) {
	if (type.kind === 'string') {
		return <StringHead type={type} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'enum') {
		return <EnumHead type={type} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'byte' || type.kind === 'short' || type.kind === 'int' || type.kind === 'long' || type.kind === 'float' || type.kind === 'double') {
		return <NumericHead type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'boolean') {
		return <BooleanHead type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'union') {
		return <UnionHead type={type} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'struct') {
		return <StructHead type={type} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'list' || type.kind === 'byte_array' || type.kind === 'int_array' || type.kind === 'long_array') {
		if (type.lengthRange?.min !== undefined && type.lengthRange.min === type.lengthRange.max) {
			return <TupleHead type={{ kind: 'tuple', items: [...Array(type.lengthRange.min)].map(() => getItemType(type)), attributes: type.attributes }} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
		}
		return <ListHead type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'tuple') {
		return <TupleHead type={type} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'literal') {
		return <LiteralHead type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	return <></>
}

function StringHead({ type, optional, node, makeEdit, ctx }: Props<StringType>) {
	const { locale } = useLocale()

	const value = JsonStringNode.is(node) ? node.value : undefined

	const idAttribute = type.attributes?.find(a => a.name === 'id')?.value
	const idRegistry = idAttribute?.kind === 'literal' && idAttribute.value.kind === 'string'
		? idAttribute.value.value
		: idAttribute?.kind === 'tree' && idAttribute.values.registry?.kind === 'literal' && idAttribute.values.registry?.value.kind === 'string'
			? idAttribute.values.registry?.value.value
			: undefined
	const isSelect = idRegistry && selectRegistries.has(idRegistry)

	const onChangeValue = useCallback((newValue: string) => {
		if (value === newValue) {
			return
		}
		makeEdit((range) => {
			if ((newValue.length === 0 && optional) || (isSelect && newValue === SPECIAL_UNSET)) {
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
	}, [optional, node, makeEdit, isSelect])

	const completions = useMemo(() => {
		return getValues(type, { ...ctx, offset: node?.range.start ?? 0 })
			.filter(c => c.kind === 'string' && c.value !== 'THIS')
	}, [type, node, ctx])

	const datalistId = `mcdoc_completions_${hexId()}`

	const gen = idRegistry ? config.generators.find(gen => gen.id === idRegistry) : undefined

	const color = type.attributes?.find(a => a.name === 'color')?.value
	const colorKind = color?.kind === 'literal' && color.value.kind === 'string' ? color.value.value : undefined

	const onRandomColor = useCallback(() => {
		const color = generateColor()
		onChangeValue('#' + (color.toString(16).padStart(6, '0') ?? '000000'))
	}, [onChangeValue])

	return <>
		{(idRegistry === 'item' && value && !value.startsWith('#')) && <label>
			<ItemDisplay item={new ItemStack(Identifier.parse(value), 1)} />	
		</label>}
		{isSelect ? <>
			<select value={value === undefined ? SPECIAL_UNSET : value} onInput={(e) => onChangeValue((e.target as HTMLInputElement).value)}>
				{(value === undefined || optional) && <option value={SPECIAL_UNSET}>{locale('unset')}</option>}
				{(value !== undefined && !completions.map(c => c.value).includes(value)) && <option value={value}>{value}</option>}
				{completions.map(c => <option value={c.value}>{formatIdentifier(c.value)}</option>)}
			</select>
		</> : <>
			{completions.length > 0 && <datalist id={datalistId}>
				{completions.map(c => <option>{c.value}</option>)}
			</datalist>}
			<input class={colorKind === 'hex_rgb' ? 'short-input' : idRegistry ? 'long-input' : ''} value={value ?? ''} onInput={(e) => onChangeValue((e.target as HTMLInputElement).value)} list={completions.length > 0 ? datalistId : undefined} />
			{value && gen && <a href={`/${gen.url}/?preset=${value?.replace(/^minecraft:/, '')}`} class="tooltipped tip-se" aria-label={locale('follow_reference')}>
				{Octicon.link_external}
			</a>}
		</>}
		{colorKind === 'hex_rgb' && <>
			<input class="short-input" type="color" value={value} onChange={(e) => onChangeValue((e.target as HTMLInputElement).value)} />
			<button class="tooltipped tip-se" aria-label={locale('generate_new_color')} onClick={onRandomColor}>{Octicon.sync}</button>
		</>}
	</>
}

function EnumHead({ type, optional, node, makeEdit }: Props<SimplifiedEnum>) {
	const { locale } = useLocale()

	const value = JsonStringNode.is(node) ? node.value : (node && JsonNumberNode.is(node)) ? Number(node.value.value) : undefined

	const onChangeValue = useCallback((newValue: string) => {
		if (value === newValue) {
			return
		}
		makeEdit((range) => {
			if (newValue === SPECIAL_UNSET) {
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

	return <select value={value === undefined ? SPECIAL_UNSET : value} onInput={(e) => onChangeValue((e.target as HTMLSelectElement).value)}>
		{(value === undefined || optional) && <option value={SPECIAL_UNSET}>{locale('unset')}</option>}
		{(value !== undefined && !type.values.map(v => v.value).includes(value)) && <option value={value}>{value}</option>}
		{type.values.map(value =>
			<option value={value.value}>{formatIdentifier(value.value.toString())}</option>
		)}
	</select>
}

function NumericHead({ type, node, makeEdit }: Props<NumericType>) {
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

function UnionHead({ type, optional, node, makeEdit, ctx }: Props<UnionType<SimplifiedMcdocTypeNoUnion>>) {
	const { locale } = useLocale()

	const selectedType = findSelectedMember(type, node)

	const onSelect = useCallback((newValue: string) => {
		makeEdit((range) => {
			if (newValue === SPECIAL_UNSET) {
				return undefined
			}
			const newSelected = type.members[parseInt(newValue)]
			return getDefault(newSelected, range, ctx)
		})
	}, [type, makeEdit, ctx])

	const memberIndex = selectedType ? type.members.findIndex(m => quickEqualTypes(m, selectedType)) : -1

	return <>
		<select value={memberIndex > -1 ? memberIndex : SPECIAL_UNSET} onInput={(e) => onSelect((e.target as HTMLSelectElement).value)}>
			{(selectedType === undefined || optional) && <option value={SPECIAL_UNSET}>{locale('unset')}</option>}
			{type.members.map((member, index) =>
				<option value={index}>{formatIdentifier(member.kind)}</option>
			)}
		</select>
		{selectedType && <Head type={selectedType} node={node} makeEdit={makeEdit} ctx={ctx} />}
	</>
}

function StructHead({ type: outerType, optional, node, makeEdit, ctx }: Props<SimplifiedStructType>) {
	const { locale } = useLocale()
	const type = node?.typeDef?.kind === 'struct' ? node.typeDef : outerType

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

	return <>
		{optional
			? (JsonObjectNode.is(node)
				? <button class="node-collapse open tooltipped tip-se" aria-label={locale('remove')} onClick={onRemove}>
					{Octicon.trashcan}
				</button>
				: <button class="node-collapse closed tooltipped tip-se" aria-label={locale('expand')} onClick={onSetDefault}>
					{Octicon.plus_circle}
				</button>)
			: (!JsonObjectNode.is(node)
				? <button class="add tooltipped tip-se" aria-label={locale('reset')} onClick={onSetDefault}>
					{Octicon.history}
				</button>
				: <></>
			)}
	</>
}

function ListHead({ type, node, makeEdit, ctx }: Props<ListType | PrimitiveArrayType>) {
	const { locale } = useLocale()

	const canAdd = (type.lengthRange?.max ?? Infinity) > (node?.children?.length ?? 0)

	const onAddTop = useCallback(() => {
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
					node.children.unshift(newItem)
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

	return <button class="add tooltipped tip-se" aria-label={locale('add_top')} onClick={() => onAddTop()} disabled={!canAdd}>
		{Octicon.plus_circle}
	</button>
}

function TupleHead({ type, optional, node, makeEdit, ctx }: Props<TupleType>) {
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
		if (node && JsonArrayNode.is(node)) {
			return <button class="node-collapse open tooltipped tip-se" aria-label={locale('remove')} onClick={onRemove}>
				{Octicon.trashcan}
			</button>
		} else {
			return <button class="node-collapse closed tooltipped tip-se" aria-label={locale('expand')} onClick={onSetDefault}>
				{Octicon.plus_circle}
			</button>
		}
	} else {
		if (!node || !JsonArrayNode.is(node)) {
			return <button class="add tooltipped tip-se" aria-label={locale('reset')} onClick={onSetDefault}>{Octicon.history}</button>
		}
		return <></>
	}
}

function LiteralHead({ type }: Props<LiteralType>) {
	return <input value={type.value.value.toString()} disabled />
}

function Body({ type, optional, node, makeEdit, ctx }: Props<SimplifiedMcdocType>) {
	if (type.kind === 'union') {
		return <UnionBody type={type} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'struct') {
		if (!JsonObjectNode.is(node) || type.fields.length === 0) {
			return <></>
		}
		return <div class="node-body">
			<StructBody type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
		</div>
	}
	if (type.kind === 'list' || type.kind === 'byte_array' || type.kind === 'int_array' || type.kind === 'long_array') {
		if (!JsonArrayNode.is(node)) {
			return <></>
		}
		if (type.lengthRange?.min !== undefined && type.lengthRange.min === type.lengthRange.max) {
			return <div class="node-body">
				<TupleBody type={{ kind: 'tuple', items: [...Array(type.lengthRange.min)].map(() => getItemType(type)), attributes: type.attributes }} node={node} makeEdit={makeEdit} ctx={ctx} />
			</div>
		}
		if (node.children?.length === 0) {
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
	return <></>
}

function UnionBody({ type, optional, node, makeEdit, ctx }: Props<UnionType<SimplifiedMcdocTypeNoUnion>>) {
	const selectedType = findSelectedMember(type, node)
	if (selectedType === undefined) {
		return <></>
	}
	return <Body type={selectedType} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
}

interface StructBodyProps extends Props {
	type: SimplifiedStructType
}
function StructBody({ type: outerType, node, makeEdit, ctx }: StructBodyProps) {
	const { locale } = useLocale()
	if (!JsonObjectNode.is(node)) {
		return <></>
	}
	const type = node.typeDef?.kind === 'struct' ? node.typeDef : outerType
	const staticFields = type.fields.filter(field => field.key.kind === 'literal')
	const dynamicFields = type.fields.filter(field => field.key.kind !== 'literal')
	const staticChilds: core.PairNode<JsonStringNode, JsonNode>[] = []
	return <>
		{staticFields.map(field => {
			const key = (field.key as LiteralType).value.value.toString()
			const index = node.children.findIndex(p => p.key?.value === key)
			const pair = index === -1 ? undefined : node.children[index]
			if (pair) {
				staticChilds.push(pair)
			}
			const child = pair?.value
			const childType = simplifyType(field.type, ctx)
			const makeFieldEdit: MakeEdit = (edit) => {
				if (pair) {
					makeEdit(() => {
						const newChild = edit(child?.range ?? core.Range.create(pair.range.end))
						if (newChild === undefined) {
							node.children.splice(index, 1)
						} else {
							node.children[index] = {
								type: 'pair',
								range: pair.range,
								key: pair.key,
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
			return <div key={key} class="node" data-category={getCategory(field.type)}>
				<div class="node-header">
					{!field.optional && child === undefined && <ErrorIndicator error={{ message: locale('missing_key', localeQuote(key)), range: node.range, severity: 3 }} />}
					<Errors type={childType} node={child} ctx={ctx} />
					<Docs desc={field.desc} />
					<Key label={key} />
					<Head type={childType} node={child} optional={field.optional} makeEdit={makeFieldEdit} ctx={ctx} />
				</div>
				<Body type={childType} node={child} optional={field.optional} makeEdit={makeFieldEdit} ctx={ctx} />
			</div>
		})}
		{dynamicFields.map((field, index) => {
			if (field.key.kind === 'any' && field.type.kind === 'any') {
				return <></>
			}
			const incompletePairs = node.children.filter(pair => pair.value && core.Range.length(pair.value.range) === 0)
			const pair = index < incompletePairs.length ? incompletePairs[index] : undefined
			const keyType = simplifyType(field.key, ctx)
			const makeKeyEdit: MakeEdit = (edit) => {
				makeEdit(() => {
					const newKey = edit(pair?.key?.range ?? core.Range.create(node.range.end))
					const index = pair ? node.children.indexOf(pair) : -1
					if (!newKey || !JsonStringNode.is(newKey) || newKey.value.length === 0) {
						if (index !== -1) {
							node.children.splice(index, 1)
						}
						return node
					}
					const newPair: core.PairNode<JsonStringNode, JsonNode> = {
						type: 'pair',
						range: newKey?.range,
						key: newKey,
					}
					newKey.parent = newPair
					if (index !== -1) {
						node.children.splice(index, 1, newPair)
					} else {
						node.children.push(newPair)
					}
					newPair.parent = node
					return node
				})
			}
			const onAddKey = () => {
				const keyNode = pair?.key
				const index = pair ? node.children.indexOf(pair) : -1
				if (!pair || !keyNode || index === -1) {
					return
				}
				makeEdit((range) => {
					const valueNode = getDefault(simplifyType(field.type, ctx), range, ctx)
					const newPair: core.PairNode<JsonStringNode, JsonNode> = {
						type: 'pair',
						range: keyNode.range,
						key: keyNode,
						value: valueNode,
					}
					valueNode.parent = newPair
					node.children.splice(index, 1, newPair)
					newPair.parent = node
					return node
				})
			}
			return <div class="node">
				<div key={`__dynamic_${index}__`} class="node-header">
					<Docs desc={field.desc} />
					<Head type={keyType} node={pair?.key} makeEdit={makeKeyEdit} ctx={ctx} />
					<button class="add tooltipped tip-se" aria-label={locale('add_key')} onClick={onAddKey} disabled={pair === undefined}>{Octicon.plus_circle}</button>
				</div>
			</div>
		})}
		{node.children.map((pair, index) => {
			const key = pair.key?.value
			if (staticChilds.includes(pair) || !key) {
				return <></>
			}
			if (pair.value && core.Range.length(pair.value.range) === 0) {
				return <></>
			}
			const child = pair.value
			// TODO: correctly determine which dynamic field this is a key for
			const fieldType = dynamicFields[0]?.type
			if (!fieldType) {
				return <></>
			}
			const childType = simplifyType(fieldType, ctx)
			const makeFieldEdit: MakeEdit = (edit) => {
				makeEdit(() => {
					const newChild = edit(child?.range ?? core.Range.create(pair.range.end))
					if (newChild === undefined) {
						node.children.splice(index, 1)
					} else {
						node.children[index] = {
							type: 'pair',
							range: pair.range,
							key: pair.key,
							value: newChild,
						}
					}
					return node
				})
			}
			return <div key={key} class="node" data-category={getCategory(fieldType)}>
				<div class="node-header">
					<Errors type={childType} node={child} ctx={ctx} />
					<button class="remove tooltipped tip-se" aria-label={locale('remove')} onClick={() => makeFieldEdit(() => undefined)}>
						{Octicon.trashcan}
					</button>
					<Key label={key} />
					<Head type={childType} node={child} makeEdit={makeFieldEdit} ctx={ctx} />
				</div>
				<Body type={childType} node={child} makeEdit={makeFieldEdit} ctx={ctx} />
			</div>
		})}
	</>
}

function Key({ label }: { label: string | number | boolean }) {
	return <label>{formatIdentifier(label.toString())}</label>
}

function ListBody({ type: outerType, node, makeEdit, ctx }: Props<ListType | PrimitiveArrayType>) {
	const { locale } = useLocale()
	if (!JsonArrayNode.is(node)) {
		return <></>
	}
	const type = (node.typeDef?.kind === 'list' || node.typeDef?.kind === 'byte_array' || node.typeDef?.kind === 'int_array' || node.typeDef?.kind === 'long_array') ? node.typeDef : outerType
	const canAdd = (type.lengthRange?.max ?? Infinity) > (node?.children?.length ?? 0)

	const onRemoveItem = useCallback((index: number) => {
		makeEdit(() => {
			node.children.splice(index, 1)
			return node
		})
	}, [makeEdit, node])

	const onMoveUp = useCallback((index: number) => {
		if (node.children.length <= 1 || index <= 0) {
			return
		}
		makeEdit(() => {
			const moved = node.children.splice(index, 1)
			node.children.splice(index - 1, 0, ...moved)
			return node
		})
	}, [makeEdit])

	const onMoveDown = useCallback((index: number) => {
		if (node.children.length <= 1 || index >= node.children.length - 1) {
			return
		}
		makeEdit(() => {
			const moved = node.children.splice(index, 1)
			node.children.splice(index + 1, 0, ...moved)
			return node
		})
	}, [makeEdit])

	const onAddBottom = useCallback(() => {
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

	return <>
		{node.children.map((item, index) => {
			const child = item.value
			const itemType = getItemType(type)
			const childType = simplifyType(itemType, ctx)
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
			const canMoveUp = node.children.length > 1 && index > 0
			const canMoveDown = node.children.length > 1 && index < (node.children.length - 1)
			return <div key={index} class="node" data-category={getCategory(itemType)}>
				<div class="node-header">
					<Errors type={childType} node={child} ctx={ctx} />
					<button class="remove tooltipped tip-se" aria-label={locale('remove')} onClick={() => onRemoveItem(index)}>
						{Octicon.trashcan}
					</button>
					{(canMoveUp || canMoveDown) && <div class="node-move">
						<button class="move tooltipped tip-se" aria-label={locale('move_up')} disabled={!canMoveUp} onClick={() => onMoveUp(index)}>
							{Octicon.chevron_up}
						</button>
						<button class="move tooltipped tip-se" aria-label={locale('move_down')} disabled={!canMoveDown} onClick={() => onMoveDown(index)}>
							{Octicon.chevron_down}
						</button>
					</div>}
					<Key label="entry" />
					<Head type={childType} node={child} makeEdit={makeItemEdit} ctx={ctx} />
				</div>
				{childType.kind === 'struct'
					? <div class="node-body-flat">
						<StructBody type={childType} node={child} makeEdit={makeItemEdit} ctx={ctx} />
					</div>
					: <Body type={childType} node={child} makeEdit={makeItemEdit} ctx={ctx} />}
			</div>
		})}
		{node.children.length > 0 && <div class="node-header">
			<button class="add tooltipped tip-se" aria-label={locale('add_bottom')} onClick={() => onAddBottom()} disabled={!canAdd}>
				{Octicon.plus_circle}
			</button>
		</div>}
	</>
}

function TupleBody({ type, node, makeEdit, ctx }: Props<TupleType>) {
	if (!JsonArrayNode.is(node)) {
		return <></>
	}
	return <>
		{type.items.map((itemType, index) => {
			const item = node?.children?.[index]
			const child = item?.value
			const childType = simplifyType(itemType, ctx)
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
			return <div key={index} class="node">
				<div class="node-header">
					<Errors type={childType} node={child} ctx={ctx} />
					<Key label="entry" />
					<Head type={childType} node={child} makeEdit={makeItemEdit} ctx={ctx} />
				</div>
				<Body type={childType} node={child} makeEdit={makeItemEdit} ctx={ctx} />
			</div>
		})}
	</>
}

interface ErrorsProps {
	type: SimplifiedMcdocType
	node: JsonNode | undefined
	ctx: McdocContext
}
function Errors({ type, node, ctx }: ErrorsProps) {
	const errors = useMemo(() => {
		if (node === undefined) {
			return []
		}
		const errors = ctx.err.errors
			// Get all errors inside the current node
			.filter(e => core.Range.containsRange(node.range, e.range, true))
			// Unless they are inside a child node
			.filter(e => !node.children?.some(c => (c.type === 'item' || c.type === 'pair') && core.Range.containsRange(c.range, e.range, true)))
			// Filter out "Missing key" errors
			.filter(e => !(core.Range.length(e.range) === 1 && (type.kind === 'struct' || (type.kind === 'union' && (findSelectedMember(type, node) ?? type.members[0]).kind === 'struct'))))
		// Hide warnings if there are errors
		return errors.find(e => e.severity === 3)
			? errors.filter(e => e.severity === 3)
			: errors
	}, [type, node, ctx])

	return <>
		{errors.map(e => <ErrorIndicator error={e} />)}	
	</>
}

interface ErrorIndicatorProps {
	error: core.LanguageError
}
function ErrorIndicator({ error }: ErrorIndicatorProps) {
	const [active, setActive] = useFocus()

	return <div class={`node-icon ${error.severity === 2 ? 'node-warning' : 'node-error'} ${active ? 'show' : ''}`} onClick={() => setActive()}>
		{Octicon.issue_opened}
		<span class="icon-popup">{error.message.replace(/ \(rule: [a-zA-Z]+\)$/, '')}</span>
	</div>
}

interface DocsProps {
	desc: string | undefined
}
function Docs({ desc }: DocsProps) {
	if (!desc || desc.length === 0) {
		return <></>
	}

	const [active, setActive] = useFocus()

	return <div class={`node-icon node-help ${active ? 'show' : ''}`} onClick={() => setActive()}>
		{Octicon.info}
		<span class="icon-popup">{desc}</span>
	</div>
}

function getDefault(type: SimplifiedMcdocType, range: core.Range, ctx: McdocContext): JsonNode {
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
				if (field.kind === 'pair' && !field.optional && (typeof field.key === 'string' || field.key.kind === 'literal')) {
					const key: JsonStringNode = {
						type: 'json:string',
						range,
						options: json.parser.JsonStringOptions,
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
	if (type.kind === 'list' || type.kind === 'byte_array' || type.kind === 'int_array' || type.kind === 'long_array') {
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
	return { type: 'json:null', range }
}

function formatIdentifier(id: string) {
	const formatted = id.replace(/^minecraft:/, '').replaceAll('_', ' ')
	return formatted.charAt(0).toUpperCase() + formatted.substring(1)
}

function getCategory(type: McdocType) {
	if (type.kind === 'reference' && type.path) {
		switch (type.path) {
			case '::java::data::loot::LootPool':
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

export function simplifyType(type: McdocType, ctx: McdocContext): SimplifiedMcdocType {
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

function findSelectedMember(_union: UnionType<SimplifiedMcdocTypeNoUnion>, node: JsonNode | undefined) {
	const selectedType = node?.typeDef
	if (!selectedType) {
		return undefined
	}
	if (selectedType.kind === 'union') {
		// The node technically matches all members of this union,
		// ideally the editor should show a combination of all members
		return selectedType.members[0]
	}
	return selectedType
}

import * as core from '@spyglassmc/core'
import type { JsonNode } from '@spyglassmc/json'
import * as json from '@spyglassmc/json'
import { JsonArrayNode, JsonBooleanNode, JsonNumberNode, JsonObjectNode, JsonStringNode } from '@spyglassmc/json'
import { localeQuote } from '@spyglassmc/locales'
import type { ListType, LiteralType, NumericType, PrimitiveArrayType, StringType, TupleType, UnionType } from '@spyglassmc/mcdoc'
import { handleAttributes } from '@spyglassmc/mcdoc/lib/runtime/attribute/index.js'
import type { SimplifiedEnum, SimplifiedMcdocType, SimplifiedMcdocTypeNoUnion, SimplifiedStructType, SimplifiedStructTypePairField } from '@spyglassmc/mcdoc/lib/runtime/checker/index.js'
import { getValues } from '@spyglassmc/mcdoc/lib/runtime/completer/index.js'
import { Identifier, ItemStack } from 'deepslate'
import { useCallback, useMemo, useState } from 'preact/hooks'
import config from '../../Config.js'
import { useLocale } from '../../contexts/Locale.jsx'
import { useFocus } from '../../hooks/useFocus.js'
import { generateColor, hexId, randomInt, randomSeed } from '../../Utils.js'
import { Btn } from '../Btn.jsx'
import { ItemDisplay } from '../ItemDisplay.jsx'
import { Octicon } from '../Octicon.jsx'
import { formatIdentifier, getCategory, getChange, getDefault, getItemType, isFixedList, isInlineTuple, isListOrArray, isNumericType, isSelectRegistry, quickEqualTypes, simplifyType } from './McdocHelpers.js'

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
	if (isNumericType(type)) {
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
	if (isListOrArray(type)) {
		if (isFixedList(type)) {
			return <TupleHead type={{ kind: 'tuple', items: [...Array(type.lengthRange.min)].map(() => getItemType(type)), attributes: type.attributes }} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
		}
		return <ListHead type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'tuple') {
		return <TupleHead type={type} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'literal') {
		return <LiteralHead type={type} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	if (type.kind === 'any' || type.kind === 'unsafe') {
		return <AnyHead type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	return <></>
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
	if (isListOrArray(type)) {
		if (!JsonArrayNode.is(node)) {
			return <></>
		}
		if (isFixedList(type)) {
			const tupleType: TupleType = { kind: 'tuple', items: [...Array(type.lengthRange.min)].map(() => getItemType(type)), attributes: type.attributes }
			if (isInlineTuple(tupleType)) {
				return <></>
			}
			return <div class="node-body">
				<TupleBody type={tupleType} node={node} makeEdit={makeEdit} ctx={ctx} />
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
		if (isInlineTuple(type)) {
			return <></>
		}
		return <div class="node-body">
			<TupleBody type={type} node={node} makeEdit={makeEdit} ctx={ctx} />
		</div>
	}
	if (type.kind === 'any' || type.kind === 'unsafe') {
		return <AnyBody type={type} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
	}
	return <></>
}

const SPECIAL_UNSET = '__unset__'

function StringHead({ type, optional, node, makeEdit, ctx }: Props<StringType>) {
	const { locale } = useLocale()

	const value = JsonStringNode.is(node) ? node.value : undefined

	const idAttribute = type.attributes?.find(a => a.name === 'id')?.value
	const idRegistry = idAttribute?.kind === 'literal' && idAttribute.value.kind === 'string'
		? idAttribute.value.value
		: idAttribute?.kind === 'tree' && idAttribute.values.registry?.kind === 'literal' && idAttribute.values.registry?.value.kind === 'string'
			? idAttribute.values.registry?.value.value
			: undefined
	const isSelect = idRegistry && isSelectRegistry(idRegistry)

	const onChangeValue = useCallback((newValue: string) => {
		if (value === newValue) {
			return
		}
		makeEdit((range) => {
			if ((newValue.length === 0 && optional) || (isSelect && newValue === SPECIAL_UNSET)) {
				return undefined
			}
			const valueMap = [{ inner: core.Range.create(0), outer: core.Range.create(range.start) }]
			const source = new core.Source(JSON.stringify(newValue), valueMap)
			const string = core.string(json.parser.JsonStringOptions)(source, ctx)
			return {
				...string,
				type: 'json:string',
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
		{((idRegistry === 'item' || idRegistry === 'block') && value && !value.startsWith('#')) && <label>
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
			<option value={value.value}>{formatIdentifier(value.identifier, value.attributes)}</option>
		)}
	</select>
}

function NumericHead({ type, node, makeEdit }: Props<NumericType>) {
	const { locale } = useLocale()

	const value = node && JsonNumberNode.is(node) ? Number(node.value.value) : undefined
	const isFloat = type.kind === 'float' || type.kind === 'double'

	const onChangeValue = useCallback((value: string | bigint | number) => {
		const number = typeof value === 'string'
			? (value.length === 0 ? undefined : Number(value))
			: value
		if (number !== undefined && Number.isNaN(number)) {
			return
		}
		makeEdit((range) => {
			if (number === undefined) {
				return undefined
			}
			const newValue: core.FloatNode | core.LongNode = isFloat
				? { type: 'float', range, value: Number(number) }
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

	const random = type.attributes?.find(a => a.name === 'random')

	const onRandom = useCallback(() => {
		onChangeValue(type.kind === 'long' ? randomSeed() : randomInt())
	}, [type, onChangeValue])

	return <>
		<input class="short-input" type="number" value={value} onInput={(e) => onChangeValue((e.target as HTMLInputElement).value)} />
		{colorKind && <>
			<input class="short-input" type="color" value={'#' + (value?.toString(16).padStart(6, '0') ?? '000000')} onChange={(e) => onChangeColor((e.target as HTMLInputElement).value)} />
			<button class="tooltipped tip-se" aria-label={locale('generate_new_color')} onClick={onRandomColor}>{Octicon.sync}</button>
		</>}
		{random && <>
			<button class="tooltipped tip-se" aria-label={locale('generate_new_seed')} onClick={onRandom}>{Octicon.sync}</button>
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

	if (type.members.length === 0) {
		return <></>
	}

	const selectedType = selectUnionMember(type, node)

	const onSelect = useCallback((newValue: string) => {
		makeEdit((range) => {
			if (newValue === SPECIAL_UNSET) {
				return undefined
			}
			const newSelected = type.members[parseInt(newValue)]
			if (node && selectedType) {
				return getChange(newSelected, selectedType, node, ctx)
			}
			return getDefault(newSelected, range, ctx)
		})
	}, [type, node, makeEdit, ctx, selectedType])

	const memberIndex = selectedType ? type.members.findIndex(m => quickEqualTypes(m, selectedType)) : -1

	return <>
		<select value={memberIndex > -1 ? memberIndex : SPECIAL_UNSET} onInput={(e) => onSelect((e.target as HTMLSelectElement).value)}>
			{(selectedType === undefined || optional) && <option value={SPECIAL_UNSET}>{locale('unset')}</option>}
			{type.members.map((member, index) =>
				<option value={index}>{formatUnionMember(member, type.members.filter(m => m !== member))}</option>
			)}
		</select>
		{selectedType && selectedType.kind !== 'literal' && <Head type={selectedType} node={node} makeEdit={makeEdit} ctx={ctx} />}
	</>
}

function formatUnionMember(type: SimplifiedMcdocTypeNoUnion, others: SimplifiedMcdocTypeNoUnion[]): string {
	if (type.kind === 'literal') {
		return formatIdentifier(type.value.value.toString())
	}
	if (!others.some(o => o.kind === type.kind)) {
		// No other member is of this kind
		return formatIdentifier(type.kind)
	}
	if (type.kind === 'struct') {
		// Show the first literal key
		const firstKey = type.fields.find(f => f.key.kind === 'literal')?.key
		if (firstKey) {
			return formatUnionMember(firstKey, [])
		}
	}
	return formatIdentifier(type.kind)
}

function UnionBody({ type, optional, node, makeEdit, ctx }: Props<UnionType<SimplifiedMcdocTypeNoUnion>>) {
	const selectedType = selectUnionMember(type, node)
	if (selectedType === undefined) {
		return <></>
	}
	return <Body type={selectedType} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
}

function selectUnionMember(union: UnionType<SimplifiedMcdocTypeNoUnion>, node: JsonNode | undefined) {
	const selectedType = node?.typeDef
	if (!selectedType || selectedType.kind === 'any' || selectedType.kind === 'unsafe') {
		return undefined
	}
	if (selectedType.kind === 'union') {
		// Find the first selected type that is also part of the original definition.
		// The node technically matches all members of this union,
		// ideally the editor should show a combination of all members
		return selectedType.members.find(m1 => union.members.find(m2 => quickEqualTypes(m1, m2)))
	}
	return selectedType
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
				? <button class="remove tooltipped tip-se" aria-label={locale('remove')} onClick={onRemove}>
					{Octicon.trashcan}
				</button>
				: <button class="add tooltipped tip-se" aria-label={locale('expand')} onClick={onSetDefault}>
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

function StructBody({ type: outerType, node, makeEdit, ctx }: Props<SimplifiedStructType>) {
	if (!JsonObjectNode.is(node)) {
		return <></>
	}

	const { locale } = useLocale()
	const { expand, collapse, isToggled } = useToggles()

	const type = node.typeDef?.kind === 'struct' ? node.typeDef : outerType
	// For some reason spyglass can include fields that haven't been filtered out in node.typeDef
	const fields = type.fields.filter(field => {
		let keep = true
		handleAttributes(field.attributes, ctx, (handler, config) => {
			if (!keep || !handler.filterElement) {
				return
			}
			if (!handler.filterElement(config, ctx)) {
				keep = false
			}
		})
		return keep
	})
	const staticFields = fields.filter(field => field.key.kind === 'literal')
	const dynamicFields = fields.filter(field => field.key.kind !== 'literal')
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
			const childType = simplifyType(field.type, ctx, { key: pair?.key, parent: node })
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
					const valueNode = getDefault(simplifyType(field.type, ctx, { key: pair.key, parent: node }), range, ctx)
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
					<Head type={keyType} optional={true} node={pair?.key} makeEdit={makeKeyEdit} ctx={ctx} />
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
			const canToggle = JsonObjectNode.is(child)
			const toggled = isToggled(key)
			const isCollapsed = canToggle && (toggled === false || (toggled === undefined && (node.children.length - staticChilds.length) > 20))
			// TODO: correctly determine which dynamic field this is a key for
			const field = dynamicFields[0] as SimplifiedStructTypePairField | undefined
			if (!field) {
				return <></>
			}
			const childType = simplifyType(field.type, ctx, { key: pair.key, parent: node })
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
			return <div key={key} class="node" data-category={getCategory(field.type)}>
				<div class="node-header">
					<Errors type={childType} node={child} ctx={ctx} />
					{canToggle && (isCollapsed
						? <button class="toggle tooltipped tip-se" aria-label={`${locale('expand')}\n${locale('expand_all', 'Ctrl')}`} onClick={expand(key)}>{Octicon.chevron_right}</button>
						: <button class="toggle tooltipped tip-se" aria-label={`${locale('collapse')}\n${locale('collapse_all', 'Ctrl')}`} onClick={collapse(key)}>{Octicon.chevron_down}</button>
					)}
					<button class="remove tooltipped tip-se" aria-label={locale('remove')} onClick={() => makeFieldEdit(() => undefined)}>
						{Octicon.trashcan}
					</button>
					<Key label={key} raw={field.key.kind === 'string'} />
					{!isCollapsed && <Head type={childType} node={child} makeEdit={makeFieldEdit} ctx={ctx} />}
				</div>
				{!isCollapsed && <Body type={childType} node={child} makeEdit={makeFieldEdit} ctx={ctx} />}
			</div>
		})}
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

function ListBody({ type: outerType, node, makeEdit, ctx }: Props<ListType | PrimitiveArrayType>) {
	if (!JsonArrayNode.is(node)) {
		return <></>
	}

	const { locale } = useLocale()
	const { expand, collapse, isToggled } = useToggles()
	const [maxShown, setMaxShown] = useState(50)

	const type = node.typeDef && isListOrArray(node.typeDef) ? node.typeDef : outerType
	const itemType = getItemType(type)
	const category = getCategory(itemType)
	const childType = simplifyType(itemType, ctx)
	const canAdd = (type.lengthRange?.max ?? Infinity) > (node?.children?.length ?? 0)

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
			if (index === maxShown) {
				return <div class="node-header">
					<label>{locale('entries_hidden', `${node.children.length - maxShown}`)}</label>
					<button onClick={() => setMaxShown(Math.min(maxShown + 50, node.children.length))}>{locale('entries_hidden.more', '50')}</button>
					<button onClick={() => setMaxShown(node.children.length)}>{locale('entries_hidden.all')}</button>
				</div>
			}
			if (index > maxShown) {
				return <></>
			}
			const key = index.toString()
			return <ListItem key={key} item={item} index={index} category={category} type={childType} isToggled={isToggled(key)} expand={expand(key)} collapse={collapse(key)} node={node} makeEdit={makeEdit} ctx={ctx} />
		})}
		{node.children.length > 0 && <div class="node-header">
			<button class="add tooltipped tip-se" aria-label={locale('add_bottom')} onClick={() => onAddBottom()} disabled={!canAdd}>
				{Octicon.plus_circle}
			</button>
		</div>}
	</>
}

interface ListItemProps extends Props {
	item: core.ItemNode<JsonNode>
	index: number
	category: string | undefined
	isToggled: boolean | undefined
	expand: (e: MouseEvent) => void
	collapse: (e: MouseEvent) => void
	node: JsonArrayNode
}
function ListItem({ item, index, category, type, isToggled, expand, collapse, node, makeEdit, ctx }: ListItemProps) {
	const { locale } = useLocale()
	const [active, setActive] = useFocus()

	const child = item.value
	const canToggle = JsonObjectNode.is(child)
	const isCollapsed = canToggle && (isToggled === false || (isToggled === undefined && node.children.length > 20))
	const canMoveUp = node.children.length > 1 && index > 0
	const canMoveDown = node.children.length > 1 && index < (node.children.length - 1)

	const onRemove = useCallback(() => {
		makeEdit(() => {
			node.children.splice(index, 1)
			return node
		})
	}, [makeEdit, node, index])

	const onMoveUp = useCallback(() => {
		if (node.children.length <= 1 || index <= 0) {
			return
		}
		makeEdit(() => {
			const moved = node.children.splice(index, 1)
			node.children.splice(index - 1, 0, ...moved)
			return node
		})
	}, [makeEdit, node, index])

	const onMoveDown = useCallback(() => {
		if (node.children.length <= 1 || index >= node.children.length - 1) {
			return
		}
		makeEdit(() => {
			const moved = node.children.splice(index, 1)
			node.children.splice(index + 1, 0, ...moved)
			return node
		})
	}, [makeEdit, node, index])

	const onDuplicate = useCallback(() => {
		makeEdit(() => {
			node.children.splice(index + 1, 0, node.children[index])
			return node
		})
	}, [makeEdit, node, index])

	const makeItemEdit: MakeEdit = useCallback((edit) => {
		makeEdit(() => {
			const newChild = edit(child?.range ?? item.range)
			node.children[index] = {
				type: 'item',
				range: item.range,
				value: newChild,
			}
			return node
		})
	}, [makeEdit, child, item, node])

	const onContextMenu = (evt: MouseEvent) => {
		evt.preventDefault()
		setActive()
	}

	return <div class="node" data-category={category}>
		<div class="node-header" onContextMenu={onContextMenu}>
			<Errors type={type} node={child} ctx={ctx} />
			{canToggle && (isCollapsed
				? <button class="toggle tooltipped tip-se" aria-label={`${locale('expand')}\n${locale('expand_all', 'Ctrl')}`} onClick={expand}>{Octicon.chevron_right}</button>
				: <button class="toggle tooltipped tip-se" aria-label={`${locale('collapse')}\n${locale('collapse_all', 'Ctrl')}`} onClick={collapse}>{Octicon.chevron_down}</button>
			)}
			<button class="remove tooltipped tip-se" aria-label={locale('remove')} onClick={onRemove}>
				{Octicon.trashcan}
			</button>
			{(canMoveUp || canMoveDown) && <div class="node-move">
				<button class="move tooltipped tip-se" aria-label={locale('move_up')} disabled={!canMoveUp} onClick={onMoveUp}>
					{Octicon.chevron_up}
				</button>
				<button class="move tooltipped tip-se" aria-label={locale('move_down')} disabled={!canMoveDown} onClick={onMoveDown}>
					{Octicon.chevron_down}
				</button>
			</div>}
			{active && <div class="node-menu">
				<div class="menu-item">
					<Btn icon="duplicate" onClick={onDuplicate}/>
					<span>{locale('duplicate')}</span>
				</div>
			</div>}
			<Key label="entry" />
			{!isCollapsed && <Head type={type} node={child} makeEdit={makeItemEdit} ctx={ctx} />}
		</div>
		{!isCollapsed && (type.kind === 'struct'
			? <div class="node-body-flat">
				<StructBody type={type} node={child} makeEdit={makeItemEdit} ctx={ctx} />
			</div>
			: <Body type={type} node={child} makeEdit={makeItemEdit} ctx={ctx} />)}
	</div>
}

function TupleHead({ type, optional, node, makeEdit, ctx }: Props<TupleType>) {
	const { locale } = useLocale()

	const isInline = isInlineTuple(type)

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
			? (JsonArrayNode.is(node)
				? <button class="remove tooltipped tip-se" aria-label={locale('remove')} onClick={onRemove}>
					{Octicon.trashcan}
				</button>
				: <button class="add tooltipped tip-se" aria-label={locale('expand')} onClick={onSetDefault}>
					{Octicon.plus_circle}
				</button>)
			: (!JsonArrayNode.is(node)
				? <button class="add tooltipped tip-se" aria-label={locale('reset')} onClick={onSetDefault}>
					{Octicon.history}
				</button>
				: <></>
			)}
		{isInline && JsonArrayNode.is(node) && type.items.map((itemType, index) => {
			const item = node?.children?.[index]
			const child = item?.value
			const childType = simplifyType(itemType, ctx)
			const makeItemEdit: MakeEdit = (edit) => {
				makeEdit((range) => {
					const newChild = edit(child?.range ?? node?.range ?? range)
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
			return <Head type={childType} node={child} makeEdit={makeItemEdit} ctx={ctx} />
		})}
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

function LiteralHead({ type, optional, node, makeEdit, ctx }: Props<LiteralType>) {
	return <UnionHead type={{ kind: 'union', members: [type] }} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
}

const ANY_TYPES: SimplifiedMcdocType[] = [
	{ kind: 'boolean' },
	{ kind: 'double' },
	{ kind: 'string' },
	{ kind: 'list', item: { kind: 'any' } },
	{ kind: 'struct', fields: [ { kind: 'pair', key: { kind: 'string' }, type: { kind: 'any' } }] },
]

function AnyHead({ optional, node, makeEdit, ctx }: Props) {
	const { locale } = useLocale()

	const selectedType = selectAnyType(node)

	const onSelect = useCallback((newValue: string) => {
		makeEdit((range) => {
			const newSelected = ANY_TYPES.find(t => t.kind === newValue)
			if (!newSelected) {
				return undefined
			}
			return getDefault(newSelected, range, ctx)
		})
	}, [makeEdit, ctx])

	return <>
		<select value={selectedType ? selectedType.kind : SPECIAL_UNSET} onInput={(e) => onSelect((e.target as HTMLSelectElement).value)}>
			{(!selectedType || optional) && <option value={SPECIAL_UNSET}>{locale('unset')}</option>}
			{ANY_TYPES.map((type) =>
				<option value={type.kind}>{formatIdentifier(type.kind)}</option>
			)}
		</select>
		{selectedType && <Head type={selectedType} node={node} makeEdit={makeEdit} ctx={ctx} />}
	</>
}

function AnyBody({ optional, node, makeEdit, ctx }: Props) {
	const selectedType = selectAnyType(node)

	if (!selectedType) {
		return <></>
	}

	return <Body type={selectedType} optional={optional} node={node} makeEdit={makeEdit} ctx={ctx} />
}

function selectAnyType(node: JsonNode | undefined) {
	switch (node?.type) {
		case 'json:boolean': return ANY_TYPES[0]
		case 'json:number': return ANY_TYPES[1]
		case 'json:string': return ANY_TYPES[2]
		case 'json:array': return ANY_TYPES[3]
		case 'json:object': return ANY_TYPES[4]
		default: return undefined
	}
}

interface KeyProps {
	label: string | number | boolean
	raw?: boolean
}
function Key({ label, raw }: KeyProps) {
	return <label>{raw ? label.toString() : formatIdentifier(label.toString())}</label>
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
			.filter(e => !(core.Range.length(e.range) === 1 && (type.kind === 'struct' || (type.kind === 'union' && (selectUnionMember(type, node) ?? type.members[0]).kind === 'struct'))))
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

function useToggles() {
	const [toggleState, setToggleState] = useState(new Map<string, boolean>())
	const [toggleAll, setToggleAll] = useState<boolean | undefined>(undefined)

	const expand = useCallback((key: string) => (evt: MouseEvent) => {
		if (evt.ctrlKey) {
			setToggleState(new Map())
			setToggleAll(true)
		} else {
			setToggleState(state => new Map(state.set(key, true)))
		}
	}, [])

	const collapse = useCallback((key: string) => (evt: MouseEvent) => {
		if (evt.ctrlKey) {
			setToggleState(new Map())
			setToggleAll(false)
		} else {
			setToggleState(state => new Map(state.set(key, false)))
		}
	}, [])
	
	const isToggled = useCallback((key: string) => {
		if (!(toggleState instanceof Map)) return false
		return toggleState.get(key) ?? toggleAll
	}, [toggleState, toggleAll])

	return { expand, collapse, isToggled }
}

import type { BooleanHookParams, EnumOption, Hook, INode, NumberHookParams, StringHookParams, ValidationOption } from '@mcschema/core'
import { DataModel, MapNode, ModelPath, ObjectNode, Path, relativePath, StringNode } from '@mcschema/core'
import type { ComponentChildren, JSX } from 'preact'
import { memo } from 'preact/compat'
import { useRef, useState } from 'preact/hooks'
import { Btn } from '../components'
import { Octicon } from '../components/Octicon'
import { useFocus } from '../hooks'
import { locale } from '../Locales'
import type { BlockStateRegistry } from '../Schemas'
import { deepClone, deepEqual, hexId, newSeed } from '../Utils'

const selectRegistries = ['loot_table.type', 'loot_entry.type', 'function.function', 'condition.condition', 'criterion.trigger', 'dimension.generator.type', 'dimension.generator.biome_source.type', 'dimension.generator.biome_source.preset', 'carver.type', 'feature.type', 'decorator.type', 'feature.tree.minimum_size.type', 'block_state_provider.type', 'trunk_placer.type', 'foliage_placer.type', 'tree_decorator.type', 'int_provider.type', 'float_provider.type', 'height_provider.type', 'structure_feature.type', 'surface_builder.type', 'processor.processor_type', 'rule_test.predicate_type', 'pos_rule_test.predicate_type', 'template_element.element_type', 'block_placer.type']
const hiddenFields = ['number_provider.type', 'score_provider.type', 'nbt_provider.type', 'int_provider.type', 'float_provider.type', 'height_provider.type']
const flattenedFields = ['feature.config', 'decorator.config', 'int_provider.value', 'float_provider.value', 'block_state_provider.simple_state_provider.state', 'block_state_provider.rotated_block_provider.state', 'block_state_provider.weighted_state_provider.entries.entry.data', 'rule_test.block_state', 'structure_feature.config', 'surface_builder.config', 'template_pool.elements.entry.element', 'decorator.block_survives_filter.state']
const inlineFields = ['loot_entry.type', 'function.function', 'condition.condition', 'criterion.trigger', 'dimension.generator.type', 'dimension.generator.biome_source.type', 'feature.type', 'decorator.type', 'block_state_provider.type', 'feature.tree.minimum_size.type', 'trunk_placer.type', 'foliage_placer.type', 'tree_decorator.type', 'block_placer.type', 'rule_test.predicate_type', 'processor.processor_type', 'template_element.element_type', 'nbt_operation.op', 'number_provider.value', 'score_provider.name', 'score_provider.target', 'nbt_provider.source', 'nbt_provider.target', 'generator_biome.biome']
const nbtFields = ['function.set_nbt.tag', 'advancement.display.icon.nbt', 'text_component_object.nbt', 'entity.nbt', 'block.nbt', 'item.nbt']
const fixedLists = ['generator_biome.parameters.temperature', 'generator_biome.parameters.humidity', 'generator_biome.parameters.continentalness', 'generator_biome.parameters.erosion', 'generator_biome.parameters.depth', 'generator_biome.parameters.weirdness', 'feature.end_spike.crystal_beam_target', 'feature.end_gateway.exit', 'decorator.block_filter.offset']

/**
 * Secondary model used to remember the keys of a map
 */
const keysModel = new DataModel(MapNode(
	StringNode(),
	StringNode()
), { historyMax: 0 })

type JSXTriple = [JSX.Element | null, JSX.Element | null, JSX.Element | null]
type RenderHook = Hook<[any, string, BlockStateRegistry, Record<string, any>], JSXTriple>

type NodeProps<T> = T & {
	node: INode<any>,
	path: ModelPath,
	value: any,
	lang: string,
	states: BlockStateRegistry,
	ctx: Record<string, any>,
}

export function FullNode({ model, lang, blockStates }: { model: DataModel, lang: string, blockStates: BlockStateRegistry }) {
	const path = new ModelPath(model)
	const [prefix, suffix, body] = model.schema.hook(renderHtml, path, deepClone(model.data), lang, blockStates, {})
	return suffix?.props?.children.some((c: any) => c) ? <div class={`node ${model.schema.type(path)}-node`} data-category={model.schema.category(path)}>
		<div class="node-header">{prefix}{suffix}</div>
		<div class="node-body">{body}</div>
	</div> : body
}

const renderHtml: RenderHook = {
	base() {
		return [null, null, null]
	},

	boolean(params, path, value, lang, states, ctx) {
		return [null, <BooleanSuffix {...{...params, path, value, lang, states, ctx}} />, null]
	},

	choice({ choices, config, switchNode }, path, value, lang, states, ctx) {
		const choice = switchNode.activeCase(path, true) as typeof choices[number]
		const contextPath = (config?.context) ? new ModelPath(path.getModel(), new Path(path.getArray(), [config.context])) : path
		const [prefix, suffix, body] = choice.node.hook(this, contextPath, value, lang, states, ctx)
		if (choices.length === 1) {
			return [prefix, suffix, body]
		}
		const choiceContextPath = config?.choiceContext ? new Path([], [config.choiceContext]) : config?.context ? new Path([], [config.context]) : path
		const set = (value: string) => {
			const c = choices.find(c => c.type === value) ?? choice
			path.model.set(path, c.change ? c.change(value, { wrapLists: true }) : DataModel.wrapLists(c.node.default()))
		}
		const inject = <select value={choice.type} onChange={(e) => set((e.target as HTMLSelectElement).value)}>
			{choices.map(c => <option value={c.type}>
				{pathLocale(lang, choiceContextPath.contextPush(c.type))}
			</option>)}
		</select>
		return [prefix, <>{inject}{suffix}</>, body]
	},

	list({ children, config }, path, value, lang, states, ctx) {
		const [toggleState, setToggleState] = useState(new Map<string, boolean>())
		const [maxShown, setMaxShown] = useState(50)
		const context = path.getContext().join('.')
		if (fixedLists.includes(context)) {
			const prefix = <>
				{[...Array(config.maxLength!)].map((_, i) =>
					<ErrorPopup lang={lang} path={path.modelPush(i)} />)}
				<div class="fixed-list"></div>
			</>
			const suffix = <>{[...Array(config.maxLength)].map((_, i) => {
				const child = children.hook(this, path.modelPush(i), value?.[i]?.node, lang, states, ctx)
				return child[1]
			})}</>
			return [prefix, suffix, null]
		}

		const onAdd = () => {
			if (!Array.isArray(value)) value = []
			const node = DataModel.wrapLists(children.default())
			path.model.set(path, [{ node, id: hexId() }, ...value])
		}
		const onAddBottom = () => {
			if (!Array.isArray(value)) value = []
			const node = DataModel.wrapLists(children.default())
			path.model.set(path, [...value, { node, id: hexId() }])
		}
		const suffix = <button class="add" onClick={onAdd}>{Octicon.plus_circle}</button>
		const body = <>
			{(value && Array.isArray(value)) && value.map(({ node: cValue, id: cId }, index) => {
				if (index === maxShown) {
					return <div class="node node-header">
						<label>{locale(lang, 'entries_hidden', `${value.length - maxShown}`)}</label>
						<button onClick={() => setMaxShown(Math.min(maxShown + 50, value.length))}>{locale(lang, 'entries_hidden.more', '50')}</button>
						<button onClick={() => setMaxShown(value.length)}>{locale(lang, 'entries_hidden.all')}</button>
					</div>
				}
				if (index > maxShown) {
					return null
				}

				const onExpand = () => {
					setToggleState(state => new Map(state.set(cId, true)))
				}
				const onCollapse = () => {
					setToggleState(state => new Map(state.set(cId, false)))
				}

				const cPath = path.push(index).contextPush('entry')
				const canToggle = children.type(cPath) === 'object'
				const toggle = toggleState.get(cId)
				if (canToggle && (toggle === false || (toggle === undefined && value.length > 20))) {
					return <div class="node node-header" data-category={children.category(cPath)}>
						<ErrorPopup lang={lang} path={cPath} nested />
						<button class="toggle" onClick={onExpand}>{Octicon.chevron_right}</button>
						<label>{pathLocale(lang, cPath, `${index}`)}</label>
						<Collapsed key={cId} path={cPath} value={cValue} schema={children} />
					</div>
				}

				const onRemove = () => cPath.set(undefined)
				const onMoveUp = () => {
					const v = [...path.get()];
					[v[index - 1], v[index]] = [v[index], v[index - 1]]
					path.model.set(path, v)
				}
				const onMoveDown = () => {
					const v = [...path.get()];
					[v[index + 1], v[index]] = [v[index], v[index + 1]]
					path.model.set(path, v)
				}
				return <MemoedTreeNode key={cId} path={cPath} schema={children} value={cValue} lang={lang} states={states} ctx={{...ctx, index: (index === 0 ? 1 : 0) + (index === value.length - 1 ? 2 : 0)}}>
					{canToggle && <button class="toggle" onClick={onCollapse}>{Octicon.chevron_down}</button>}
					<button class="remove" onClick={onRemove}>{Octicon.trashcan}</button>
					{value.length > 1 && <div class="node-move">
						<button class="move" onClick={onMoveUp} disabled={index === 0}>{Octicon.chevron_up}</button>
						<button class="move" onClick={onMoveDown} disabled={index === value.length - 1}>{Octicon.chevron_down}</button>
					</div>}
				</MemoedTreeNode>
			})}
			{(value && value.length > 2 && value.length <= maxShown) && <div class="node node-header">
				<button class="add" onClick={onAddBottom}>{Octicon.plus_circle}</button>
			</div>}
		</>
		return [null, suffix, body]
	},

	map({ children, keys, config }, path, value, lang, states, ctx) {
		const [toggleState, setToggleState] = useState(new Map<string, boolean>())
		const keyPath = new ModelPath(keysModel, new Path([hashString(path.toString())]))
		const onAdd = () => {
			const key = keyPath.get()
			path.model.set(path.push(key), DataModel.wrapLists(children.default()))
		}
		const blockState = config.validation?.validator === 'block_state_map' ? states?.[relativePath(path, config.validation.params.id).get()] : null
		const keysSchema = blockState?.properties
			? StringNode(null!, { enum: Object.keys(blockState.properties ?? {}) })
			: keys
		if (blockState && path.last() === 'Properties') {
			if (typeof value !== 'object') value = {}
			const properties = Object.entries(blockState.properties ?? {})
				.map(([key, values]) => [key, StringNode(null!, { enum: values })])
			Object.entries(blockState.properties ?? {}).forEach(([key, values]) => {
				if (typeof value[key] !== 'string') {
					path.model.errors.add(path.push(key), 'error.expected_string')
				} else if (!values.includes(value[key])) {
					path.model.errors.add(path.push(key), 'error.invalid_enum_option', value[key])
				}
			})
			return ObjectNode(Object.fromEntries(properties)).hook(this, path, value, lang, states, ctx)
		}
		const suffix = <>
			{keysSchema.hook(this, keyPath, keyPath.get() ?? '', lang, states, ctx)[1]}
			<button class="add" onClick={onAdd}>{Octicon.plus_circle}</button>
		</>
		const body = <>
			{typeof value === 'object' && Object.entries(value).map(([key, cValue]) => {
				const onExpand = () => {
					setToggleState(state => new Map(state.set(key, true)))
				}
				const onCollapse = () => {
					setToggleState(state => new Map(state.set(key, false)))
				}
				const cPath = path.modelPush(key)
				const canToggle = children.type(cPath) === 'object'
				const toggle = toggleState.get(key)
				if (canToggle && (toggle === false || (toggle === undefined && value.length > 20))) {
					return <div class="node node-header" data-category={children.category(cPath)}>
						<ErrorPopup lang={lang} path={cPath} nested />
						<button class="toggle" onClick={onExpand}>{Octicon.chevron_right}</button>
						<label>{key}</label>
						<Collapsed key={key} path={cPath} value={cValue} schema={children} />
					</div>
				}
				const cSchema = blockState
					? StringNode(null!, { enum: blockState.properties?.[key] ?? [] })
					: children
				if (blockState?.properties?.[key] && typeof cValue === 'string'
					&& !blockState.properties?.[key].includes(cValue)) {
					path.model.errors.add(cPath, 'error.invalid_enum_option', cValue)
				}
				const onRemove = () => cPath.set(undefined)
				return <MemoedTreeNode key={key} schema={cSchema} path={cPath} value={cValue} {...{lang, states, ctx}} label={key}>
					{canToggle && <button class="toggle" onClick={onCollapse}>{Octicon.chevron_down}</button>}
					<button class="remove" onClick={onRemove}>{Octicon.trashcan}</button>
				</MemoedTreeNode>
			})}
		</>
		return [null, suffix, body]
	},

	number(params, path, value, lang, states, ctx) {
		return [null, <NumberSuffix {...{...params, path, value, lang, states, ctx}} />, null]
	},

	object({ node, getActiveFields, getChildModelPath }, path, value, lang, states, ctx) {
		let prefix: JSX.Element | null = null
		let suffix: JSX.Element | null = null
		if (node.optional()) {
			if (value === undefined) {
				const onExpand = () => path.set(DataModel.wrapLists(node.default()))
				suffix = <button class="collapse closed" onClick={onExpand}>{Octicon.plus_circle}</button>
			} else {
				const onCollapse = () => path.set(undefined)
				suffix = <button class="collapse open" onClick={onCollapse}>{Octicon.trashcan}</button>
			}
		}
		const newCtx = (typeof value === 'object' && value !== null && node.default()?.pools)
			? { ...ctx, loot: value?.type } : ctx
		const body = <>
			{(typeof value === 'object' && value !== null && !(node.optional() && value === undefined)) &&
				Object.entries(getActiveFields(path))
					.filter(([_, child]) => child.enabled(path))
					.map(([key, child]) => {
						const cPath = getChildModelPath(path, key)
						const context = cPath.getContext().join('.')
						if (hiddenFields.includes(context)) return null
						const [cPrefix, cSuffix, cBody] = child.hook(this, cPath, value[key], lang, states, newCtx)
						if (!cPrefix && !cSuffix && !((cBody?.props?.children?.length ?? 0) > 0)) return null
						const isFlattened = child.type(cPath) === 'object' && flattenedFields.includes(context)
						const isInlined = inlineFields.includes(context)
						if (isFlattened || isInlined) {
							prefix = <>{prefix}<ErrorPopup lang={lang} path={cPath} /><HelpPopup lang={lang} path={cPath} />{cPrefix}</>
							suffix = <>{suffix}{cSuffix}</>
							return isFlattened ? cBody : null
						}
						return <MemoedTreeNode key={key} schema={child} path={cPath} value={value[key]} {...{lang, states, ctx: newCtx}} />
					})
			}
		</>
		return [prefix, suffix, body]
	},

	string(params, path, value, lang, states, ctx) {
		return [null, <StringSuffix {...{...params, path, value, lang, states, ctx}} />, null]
	},
}

function Collapsed({ path, value }: { path: ModelPath, value: any, schema: INode<any> }) {
	const context = path.getContext().join('.')
	switch (context) {
		case 'loot_table.pools.entry':
			return <label>{value?.entries?.length ?? 0} entries</label>
		case 'function.set_contents.entries.entry':
		case 'loot_pool.entries.entry':
			return <label>{value?.name?.replace(/^minecraft:/, '') ?? value?.type?.replace(/^minecraft:/, '')}</label>
	}
	for (const child of Object.values(value ?? {})) {
		if (typeof child === 'string') {
			return <label>{child.replace(/^minecraft:/, '')}</label>
		}
	}
	return null
}

function BooleanSuffix({ path, node, value, lang }: NodeProps<BooleanHookParams>) {
	const set = (target: boolean) => {
		path.model.set(path, node.optional() && value === target ? undefined : target)
	}
	return <>
		<button class={value === false ? 'selected' : ''} onClick={() => set(false)}>{locale(lang, 'false')}</button>
		<button class={value === true ? 'selected' : ''} onClick={() => set(true)}>{locale(lang, 'true')}</button>
	</>
}

function NumberSuffix({ path, config, integer, value }: NodeProps<NumberHookParams>) {
	const [text, setText] = useState(value ?? '')
	const commitTimeout = useRef<number>()
	const scheduleCommit = (value: number) => {
		if (commitTimeout.current) clearTimeout(commitTimeout.current)
		commitTimeout.current = setTimeout(() => {
			path.model.set(path, value)
		}, 500)
	}
	const onChange = (evt: Event) => {
		const value = (evt.target as HTMLInputElement).value
		const parsed = integer ? parseInt(value) : parseFloat(value)
		setText(value)
		scheduleCommit(parsed)
	}
	const onBlur = () => {
		setText(value ?? '')
	}
	const onColor = (evt: Event) => {
		const value = (evt.target as HTMLInputElement).value
		const parsed = parseInt(value.slice(1), 16)
		setText(parsed)
		scheduleCommit(parsed)
	}
	return <>
		<input type="text" value={text} onChange={onChange} onBlur={onBlur} />
		{config?.color && <input type="color" value={'#' + (value?.toString(16).padStart(6, '0') ?? '000000')} onChange={onColor} />}
		{path.equals(new Path(['generator', 'seed'])) && <button onClick={() => newSeed(path.model)}>{Octicon.sync}</button>}
	</>
}

function StringSuffix({ path, getValues, config, node, value, lang, states }: NodeProps<StringHookParams>) {
	const onChange = (evt: Event) => {
		evt.stopPropagation()
		const newValue = (evt.target as HTMLSelectElement).value
		path.model.set(path, newValue.length === 0 ? undefined : newValue)
	}
	const values = getValues()
	const context = path.getContext().join('.')
	if (nbtFields.includes(context)) {
		return <textarea value={value ?? ''} onChange={onChange}></textarea>
	} else if ((isEnum(config) && !config.additional) || selectRegistries.includes(context)) {
		let context = new Path([])
		if (isEnum(config) && typeof config.enum === 'string') {
			context = context.contextPush(config.enum)
		} else if (!isEnum(config) && config?.validator === 'resource' && typeof config.params.pool === 'string') {
			context = context.contextPush(config.params.pool)
		}
		return <select value={value ?? ''} onChange={onChange}>
			{node.optional() && <option value="">{locale(lang, 'unset')}</option>}
			{values.map(v => <option value={v}>
				{pathLocale(lang, context.contextPush(v.replace(/^minecraft:/, '')))}
			</option>)}
		</select>
	} else if (!isEnum(config) && config?.validator === 'block_state_key') {
		const blockState = states?.[relativePath(path, config.params.id).get()]
		const values = Object.keys(blockState?.properties ?? {})
		return <select value={value ?? ''} onChange={onChange}>
			{values.map(v => <option>{v}</option>)}
		</select>
	} else {
		const datalistId = hexId()
		return <>
			<input value={value ?? ''} onChange={onChange}
				list={values.length > 0 ? datalistId : ''} />
			{values.length > 0 && <datalist id={datalistId}>
				{values.map(v => <option value={v} />)}
			</datalist>}
		</>
	}
}

type TreeNodeProps = {
	schema: INode<any>,
	path: ModelPath,
	value: any,
	lang: string,
	states: BlockStateRegistry,
	ctx: Record<string, any>,
	compare?: any,
	label?: string,
	children?: ComponentChildren,
}
function TreeNode({ label, schema, path, value, lang, states, ctx, children }: TreeNodeProps) {
	const type = schema.type(path)
	const category = schema.category(path)
	const context = path.getContext().join('.')

	const [active, setActive] = useFocus()
	const onContextMenu = (evt: MouseEvent) => {
		evt.preventDefault()
		setActive()
	}

	const newCtx = {...ctx}
	delete newCtx.index
	const [prefix, suffix, body] = schema.hook(renderHtml, path, value, lang, states, newCtx)
	return <div class={`node ${type}-node`} data-category={category}>
		<div class="node-header">
			<ErrorPopup lang={lang} path={path} />
			<HelpPopup lang={lang} path={path} />
			{children}
			{prefix}
			<label onContextMenu={onContextMenu}>
				{label ?? pathLocale(lang, path, `${path.last()}`)}
				{active && <div class="node-menu">
					<div class="menu-item">
						<Btn icon="clippy" onClick={() => navigator.clipboard.writeText(context)} />
						Context:
						<span class="menu-item-context">{context}</span>
					</div>
				</div>}
			</label>
			{suffix}
		</div>
		{body && <div class="node-body">{body}</div>}
	</div>
}

const MemoedTreeNode = memo(TreeNode, (prev, next) => {
	return prev.schema === next.schema
		&& prev.lang === next.lang
		&& prev.path.equals(next.path)
		&& deepEqual(prev.ctx, next.ctx)
		&& deepEqual(prev.value, next.value)
})

function isEnum(value?: ValidationOption | EnumOption): value is EnumOption {
	return !!(value as any)?.enum
}

function hashString(str: string) {
	var hash = 0, i, chr
	for (i = 0; i < str.length; i++) {
		chr = str.charCodeAt(i)
		hash = ((hash << 5) - hash) + chr
		hash |= 0
	}
	return hash
}

function pathLocale(lang: string, path: Path, ...params: string[]) {
	const ctx = path.getContext()
	for (let i = 0; i < ctx.length; i += 1) {
		const key = ctx.slice(i).join('.')
		const result = locale(lang, key, ...params)
		if (key !== result) {
			return result
		}
	}
	return ctx[ctx.length - 1]
}

function ErrorPopup({ lang, path, nested }: { lang: string, path: ModelPath, nested?: boolean }) {
	const e = nested
		?	path.model.errors.getAll().filter(e => e.path.startsWith(path))
		: path.model.errors.get(path, true)
	if (e.length === 0) return null
	const message = locale(lang, e[0].error, ...(e[0].params ?? []))
	return popupIcon('node-error', 'issue_opened', message)
}

function HelpPopup({ lang, path }: { lang: string, path: Path }) {
	const key = path.contextPush('help').getContext().join('.')
	const message = locale(lang, key)
	if (message === key) return null
	return popupIcon('node-help', 'info', message)
}

const popupIcon = (type: string, icon: keyof typeof Octicon, popup: string) => {
	const [active, setActive] = useFocus()

	return <div class={`node-icon ${type}${active ? ' show' : ''}`} onClick={setActive}>
		{Octicon[icon]}
		<span class="icon-popup">{popup}</span>
	</div>
}

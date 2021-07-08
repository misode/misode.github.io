import type { EnumOption, Hook, ValidationOption } from '@mcschema/core'
import { DataModel, MapNode, ModelPath, ObjectNode, Path, relativePath, StringNode } from '@mcschema/core'
import type { JSX } from 'preact'
import { Octicon } from '../components/Octicon'
import { useFocus } from '../hooks'
import type { Localize } from '../Locales'
import type { BlockStateRegistry, VersionId } from '../Schemas'
import { hexId } from '../Utils'

export type TreeProps = {
	loc: Localize,
	version: VersionId,
	blockStates: BlockStateRegistry,
}

const selectRegistries = ['loot_table.type', 'loot_entry.type', 'function.function', 'condition.condition', 'criterion.trigger', 'dimension.generator.type', 'dimension.generator.biome_source.type', 'carver.type', 'feature.type', 'decorator.type', 'feature.tree.minimum_size.type', 'block_state_provider.type', 'trunk_placer.type', 'foliage_placer.type', 'tree_decorator.type', 'int_provider.type', 'float_provider.type', 'height_provider.type', 'structure_feature.type', 'surface_builder.type', 'processor.processor_type', 'rule_test.predicate_type', 'pos_rule_test.predicate_type', 'template_element.element_type', 'block_placer.type']
const hiddenFields = ['number_provider.type', 'score_provider.type', 'nbt_provider.type', 'int_provider.type', 'float_provider.type', 'height_provider.type']
const flattenedFields = ['feature.config', 'decorator.config', 'int_provider.value', 'float_provider.value', 'block_state_provider.simple_state_provider.state', 'block_state_provider.rotated_block_provider.state', 'block_state_provider.weighted_state_provider.entries.entry.data', 'rule_test.block_state', 'structure_feature.config', 'surface_builder.config', 'template_pool.elements.entry.element']
const inlineFields = ['loot_entry.type', 'function.function', 'condition.condition', 'criterion.trigger', 'dimension.generator.type', 'dimension.generator.biome_source.type', 'feature.type', 'decorator.type', 'block_state_provider.type', 'feature.tree.minimum_size.type', 'trunk_placer.type', 'foliage_placer.type', 'tree_decorator.type', 'block_placer.type', 'rule_test.predicate_type', 'processor.processor_type', 'template_element.element_type', 'nbt_operation.op', 'number_provider.value', 'score_provider.name', 'score_provider.target', 'nbt_provider.source', 'nbt_provider.target']
const nbtFields = ['function.set_nbt.tag', 'advancement.display.icon.nbt', 'text_component_object.nbt', 'entity.nbt', 'block.nbt', 'item.nbt']

/**
 * Secondary model used to remember the keys of a map
 */
const keysModel = new DataModel(MapNode(
	StringNode(),
	StringNode()
), { historyMax: 0 })

type JSXTriple = [JSX.Element | null, JSX.Element | null, JSX.Element | null]
type RenderHook = Hook<[any, TreeProps], JSXTriple>

/**
 * Renders the node and handles events to update the model
 * @returns string HTML representation of this node using the given data
 */
export const renderHtml: RenderHook = {
	base() {
		return [null, null, null]
	},

	boolean({ node }, path, value, props) {
		const set = (target: boolean) => {
			path.model.set(path, node.optional() && value === target ? undefined : target)
		}
		const suffix = <>
			<button class={value === false ? 'selected' : ''} onClick={() => set(false)}>{props.loc('false')}</button>
			<button class={value === true ? 'selected' : ''} onClick={() => set(true)}>{props.loc('true')}</button>
		</>
		return [null, suffix, null]
	},

	choice({ choices, config, switchNode }, path, value, props) {
		const choice = switchNode.activeCase(path, true) as typeof choices[number]
		const contextPath = (config?.context) ? new ModelPath(path.getModel(), new Path(path.getArray(), [config.context])) : path
		const [prefix, suffix, body] = choice.node.hook(this, contextPath, value, props)
		if (choices.length === 1) {
			return [prefix, suffix, body]
		}
		const choiceContextPath = config?.choiceContext ? new Path([], [config.choiceContext]) : config?.context ? new Path([], [config.context]) : path
		const set = (value: string) => {
			const c = choices.find(c => c.type === value) ?? choice
			path.model.set(path, c.change ? c.change(value) : c.node.default())
		}
		const inject = <select value={choice.type} onChange={(e) => set((e.target as HTMLSelectElement).value)}>
			{choices.map(c => <option value={c.type}>
				{pathLocale(props.loc, choiceContextPath.contextPush(c.type))}
			</option>)}
		</select>
		return [prefix, <>{inject}{suffix}</>, body]
	},

	list({ children }, path, value, props) {
		const onAdd = () => {
			if (!Array.isArray(value)) value = []
			path.model.set(path, [children.default(), ...value])
		}
		const onAddBottom = () => {
			if (!Array.isArray(value)) value = []
			path.model.set(path, [...value, children.default()])
		}
		const suffix = <button class="add" onClick={onAdd}>{Octicon.plus_circle}</button>
		const body = <>
			{(value && Array.isArray(value)) && value.map((child, index) => {
				const cPath = path.push(index).contextPush('entry')
				const [cPrefix, cSuffix, cBody] = children.hook(this, cPath, child, props)
				const onRemove = () => cPath.set(undefined)
				const onMoveUp = () => {
					[value[index - 1], value[index]] = [value[index], value[index - 1]]
					path.model.set(path, value)
				}
				const onMoveDown = () => {
					[value[index + 1], value[index]] = [value[index], value[index + 1]]
					path.model.set(path, value)
				}
				return <div class="node-entry">
					<div class={`node ${children.type(cPath)}-node`} data-category={children.category(cPath)}>
						<div class="node-header">
							<ErrorPopup loc={props.loc} path={cPath} />
							<HelpPopup loc={props.loc} path={cPath} />
							<button class="remove" onClick={onRemove}>{Octicon.trashcan}</button>
							{value.length > 1 && <div class="node-move">
								<button class="move" onClick={onMoveUp} disabled={index === 0}>{Octicon.chevron_up}</button>
								<button class="move" onClick={onMoveDown} disabled={index === value.length - 1}>{Octicon.chevron_down}</button>
							</div>}
							{cPrefix}
							<label>{pathLocale(props.loc, cPath, `${index}`)}</label>
							{cSuffix}
						</div>
						{cBody && <div class="node-body">{cBody}</div>}
					</div>
				</div>
			})}
			{(value && value.length > 2) && <div class="node-entry">
				<div class="node node-header">
					<button class="add" onClick={onAddBottom}>{Octicon.plus_circle}</button>
				</div>
			</div>}
		</>
		return [null, suffix, body]
	},

	map({ children, keys, config }, path, value, props) {
		const keyPath = new ModelPath(keysModel, new Path([hashString(path.toString())]))
		const onAdd = () => {
			const key = keyPath.get()
			path.model.set(path.push(key), children.default())
		}
		const blockState = config.validation?.validator === 'block_state_map'? props.blockStates?.[relativePath(path, config.validation.params.id).get()] : null
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
			return ObjectNode(Object.fromEntries(properties)).hook(this, path, value, props)
		}
		const suffix = <>
			{keysSchema.hook(this, keyPath, keyPath.get() ?? '', props)[1]}
			<button class="add" onClick={onAdd}>{Octicon.plus_circle}</button>
		</>
		const body = <>
			{typeof value === 'object' && Object.keys(value).map(key => {
				const cPath = path.modelPush(key)
				const cSchema = blockState
					? StringNode(null!, { enum: blockState.properties?.[key] ?? [] })
					: children
				if (blockState?.properties?.[key] && !blockState.properties?.[key].includes(value[key])) {
					path.model.errors.add(cPath, 'error.invalid_enum_option', value[key])
				}
				const [cPrefix, cSuffix, cBody] = cSchema.hook(this, cPath, value[key], props)
				const onRemove = () => cPath.set(undefined)
				return <div class="node-entry">
					<div class={`node ${children.type(cPath)}-node`} data-category={children.category(cPath)}>
						<div class="node-header">
							<ErrorPopup loc={props.loc} path={cPath} />
							<HelpPopup loc={props.loc} path={cPath} />
							<button class="remove" onClick={onRemove}>{Octicon.trashcan}</button>
							{cPrefix}
							<label>{key}</label>
							{cSuffix}
						</div>
						{cBody && <div class="node-body">{cBody}</div>}
					</div>
				</div>
			})}
		</>
		return [null, suffix, body]
	},

	number({ integer, config }, path, value) {
		const onChange = (evt: Event) => {
			const value = (evt.target as HTMLInputElement).value
			const parsed = config?.color
				? parseInt(value.slice(1), 16)
				: integer ? parseInt(value) : parseFloat(value)
			path.model.set(path, parsed)
		}
		const suffix = <input type={config?.color ? 'color' : 'text'} onChange={onChange}
			value={config?.color ? '#' + value?.toString(16).padStart(6, '0') ?? '#000000' : value ?? ''} />
		return [null, suffix, null]
	},

	object({ node, getActiveFields, getChildModelPath }, path, value, props) {
		let prefix: JSX.Element | null = null
		let suffix: JSX.Element | null = null
		if (node.optional()) {
			if (value === undefined) {
				const onExpand = () => path.set(node.default())
				suffix = <button class="collapse closed" onClick={onExpand}>${Octicon.plus_circle}</button>
			} else {
				const onCollapse = () => path.set(undefined)
				suffix = <button class="collapse open" onClick={onCollapse}>${Octicon.trashcan}</button>
			}
		}
		const body = <>
			{(typeof value === 'object' && !(node.optional() && value === undefined)) &&
				Object.entries(getActiveFields(path))
					.filter(([_, child]) => child.enabled(path))
					.map(([key, child]) => {
						const cPath = getChildModelPath(path, key)
						const context = cPath.getContext().join('.')
						if (hiddenFields.includes(context)) return null
						const [cPrefix, cSuffix, cBody] = child.hook(this, cPath, value[key], props)
						if (!cPrefix && !cSuffix && !cBody) return null
						const isFlattened = child.type(cPath) === 'object' && flattenedFields.includes(context)
						const isInlined = inlineFields.includes(context)
						if (isFlattened || isInlined) {
							prefix = <>{prefix}<ErrorPopup loc={props.loc} path={cPath} /><HelpPopup loc={props.loc} path={cPath} />{cPrefix}</>
							suffix = <>{suffix}{cSuffix}</>
							return isFlattened ? cBody : null
						}
						return <div class={`node ${child.type(cPath)}-node${cBody ? '' : ' no-body'}`}
							data-category={child.category(cPath)}>
							<div class="node-header">
								<ErrorPopup loc={props.loc} path={cPath} />
								<HelpPopup loc={props.loc} path={cPath} />
								{cPrefix}
								<label>{pathLocale(props.loc, cPath)}</label>
								{cSuffix}
							</div>
							{cBody && <div class="node-body">{cBody}</div>}
						</div>
					})
			}
		</>
		return [prefix, suffix, body]
	},

	string({ node, getValues, config }, path, value, props) {
		const onChange = (evt: Event) => {
			const newValue = (evt.target as HTMLSelectElement).value
			path.model.set(path, newValue.length === 0 ? undefined : newValue)
			evt.stopPropagation()
		}
		let suffix = null
		const values = getValues()
		const context = path.getContext().join('.')
		if (nbtFields.includes(context)) {
			suffix = <textarea value={value ?? ''} onChange={onChange}></textarea>
		} else if ((isEnum(config) && !config.additional) || selectRegistries.includes(context)) {
			let context = new Path([])
			if (isEnum(config) && typeof config.enum === 'string') {
				context = context.contextPush(config.enum)
			} else if (!isEnum(config) && config?.validator === 'resource' && typeof config.params.pool === 'string') {
				context = context.contextPush(config.params.pool)
			}
			suffix = <select value={value ?? ''} onChange={onChange}>
				{node.optional() && <option value="">{props.loc('unset')}</option>}
				{values.map(v => <option value={v}>
					{pathLocale(props.loc, context.contextPush(v.replace(/^minecraft:/, '')))}
				</option>)}
			</select>
		} else if (!isEnum(config) && config?.validator === 'block_state_key') {
			const blockState = props.blockStates?.[relativePath(path, config.params.id).get()]
			const values = Object.keys(blockState?.properties ?? {})
			suffix = <select value={value ?? ''} onChange={onChange}>
				{values.map(v => `<option>${v}</option>`).join('')}
			</select>
		} else {
			const datalistId = hexId()
			suffix = <>
				<input value={value ?? ''} onChange={onChange}
					list={values.length > 0 ? datalistId : ''} />
				{values.length > 0 && <datalist id={datalistId}>
					{values.map(v => <option value={v} />)}
				</datalist>}
			</>
		}
		return [null, suffix, null]
	},
}

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

function pathLocale(loc: Localize, path: Path, ...params: string[]) {
	const ctx = path.getContext()
	for (let i = 0; i < ctx.length; i += 1) {
		const key = ctx.slice(i).join('.')
		const result = loc(key, ...params)
		if (key !== result) {
			return result
		}
	}
	return ctx[ctx.length - 1]
}

function ErrorPopup({ loc, path }: { loc: Localize, path: ModelPath }) {
	const e = path.model.errors.get(path, true)
	if (e.length === 0) return null
	const message = e[0].params ? loc(e[0].error, ...e[0].params) : loc(e[0].error)
	return popupIcon('node-error', 'issue_opened', message)
}

function HelpPopup({ loc, path }: { loc: Localize, path: Path }) {
	const key = path.contextPush('help').getContext().join('.')
	const message = loc(key)
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

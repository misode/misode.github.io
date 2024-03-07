import type { BooleanHookParams, EnumOption, Hook, INode, NodeChildren, NumberHookParams, StringHookParams, ValidationOption } from '@mcschema/core'
import { DataModel, ListNode, MapNode, ModelPath, ObjectNode, Path, relativePath, StringNode } from '@mcschema/core'
import { Identifier, ItemStack } from 'deepslate/core'
import type { ComponentChildren, JSX } from 'preact'
import { memo } from 'preact/compat'
import { useState } from 'preact/hooks'
import { Btn, Octicon } from '../components/index.js'
import { ItemDisplay } from '../components/ItemDisplay.jsx'
import { VanillaColors } from '../components/previews/BiomeSourcePreview.jsx'
import config from '../Config.js'
import { localize, useLocale, useStore } from '../contexts/index.js'
import { useFocus } from '../hooks/index.js'
import type { BlockStateRegistry, VersionId } from '../services/index.js'
import { CachedDecorator, CachedFeature } from '../services/index.js'
import { deepClone, deepEqual, generateColor, generateUUID, hexId, hexToRgb, isObject, newSeed, rgbToHex, stringToColor } from '../Utils.js'
import { ModelWrapper } from './ModelWrapper.js'

const selectRegistries = ['loot_table.type', 'loot_entry.type', 'function.function', 'condition.condition', 'criterion.trigger', 'recipe.type', 'dimension.generator.type', 'dimension.generator.biome_source.type', 'dimension.generator.biome_source.preset', 'carver.type', 'feature.type', 'decorator.type', 'feature.tree.minimum_size.type', 'block_state_provider.type', 'trunk_placer.type', 'foliage_placer.type', 'tree_decorator.type', 'int_provider.type', 'float_provider.type', 'height_provider.type', 'structure_feature.type', 'surface_builder.type', 'processor.processor_type', 'rule_test.predicate_type', 'pos_rule_test.predicate_type', 'template_element.element_type', 'block_placer.type', 'block_predicate.type', 'material_rule.type', 'material_condition.type', 'structure_placement.type', 'density_function.type', 'root_placer.type', 'entity.type_specific.cat.variant', 'entity.type_specific.frog.variant', 'rule_block_entity_modifier.type', 'pool_alias_binding.type', 'lithostitched.worldgen_modifier.type', 'lithostitched.modifier_predicate.type', 'ohthetreesyoullgrow.configured_feature.type']
const datalistEnums = ['item_stack.components', 'function.set_components.components']
const hiddenFields = ['number_provider.type', 'score_provider.type', 'nbt_provider.type', 'int_provider.type', 'float_provider.type', 'height_provider.type']
const flattenedFields = ['feature.config', 'decorator.config', 'int_provider.value', 'float_provider.value', 'block_state_provider.simple_state_provider.state', 'block_state_provider.rotated_block_provider.state', 'block_state_provider.weighted_state_provider.entries.entry.data', 'rule_test.block_state', 'structure_feature.config', 'surface_builder.config', 'template_pool.elements.entry.element', 'decorator.block_survives_filter.state', 'material_rule.block.result_state']
const inlineFields = ['loot_entry.type', 'function.function', 'condition.condition', 'criterion.trigger', 'dimension.generator.type', 'dimension.generator.biome_source.type', 'feature.type', 'decorator.type', 'block_state_provider.type', 'feature.tree.minimum_size.type', 'trunk_placer.type', 'foliage_placer.type', 'tree_decorator.type', 'block_placer.type', 'rule_test.predicate_type', 'processor.processor_type', 'template_element.element_type', 'nbt_operation.op', 'number_provider.value', 'score_provider.name', 'score_provider.target', 'nbt_provider.source', 'nbt_provider.target', 'generator_biome.biome', 'block_predicate.type', 'material_rule.type', 'material_condition.type', 'density_function.type', 'root_placer.type', 'entity.type_specific.type', 'glyph_provider.type', 'sprite_source.type', 'rule_block_entity_modifier.type', 'immersive_weathering.area_condition.type', 'immersive_weathering.block_growth.growth_for_face.entry.direction', 'immersive_weathering.position_test.predicate_type', 'pool_alias_binding.type', 'item_stack.id', 'data_component.banner_patterns.entry.pattern', 'data_component.container.entry.slot', 'map_decoration.type', 'suspicious_stew_effect_instance.id']
const nbtFields = ['function.set_nbt.tag', 'advancement.display.icon.nbt', 'text_component_object.nbt', 'entity.nbt', 'block.nbt', 'item.nbt']
const fixedLists = ['generator_biome.parameters.temperature', 'generator_biome.parameters.humidity', 'generator_biome.parameters.continentalness', 'generator_biome.parameters.erosion', 'generator_biome.parameters.depth', 'generator_biome.parameters.weirdness', 'feature.end_spike.crystal_beam_target', 'feature.end_gateway.exit', 'decorator.block_filter.offset', 'block_predicate.has_sturdy_face.offset', 'block_predicate.inside_world_bounds.offset', 'block_predicate.matching_block_tag.offset', 'block_predicate.matching_blocks.offset', 'block_predicate.matching_fluids.offset', 'block_predicate.would_survive.offset', 'model_element.from', 'model_element.to', 'model_element.rotation.origin', 'model_element.faces.uv', 'item_transform.rotation', 'item_transform.translation', 'item_transform.scale', 'generator_structure.random_spread.locate_offset', 'pack_overlay.formats', 'data_component.profile.id', 'data_component.lodestone_tracker.tracker.pos']
const collapsedFields = ['noise_settings.surface_rule', 'noise_settings.noise.terrain_shaper']
const collapsableFields = ['density_function.argument', 'density_function.argument1', 'density_function.argument2', 'density_function.input', 'density_function.when_in_range', 'density_function.when_out_of_range']
const itemPreviewFields = ['loot_pool.entries.entry', 'loot_entry.alternatives.children.entry', 'loot_entry.group.children.entry', 'loot_entry.sequence.children.entry', 'function.set_contents.entries.entry']

const findGenerator = (id: string) => {
	return config.generators.find(g => g.id === id.replace(/^\$/, ''))
}

/**
 * Secondary model used to remember the keys of a map
 */
const keysModel = new DataModel(MapNode(
	StringNode(),
	StringNode()
), { historyMax: 0 })

type JSXTriple = [JSX.Element | null, JSX.Element | null, JSX.Element | null]
type RenderHook = Hook<[any, string, VersionId, BlockStateRegistry, Record<string, any>], JSXTriple>

type NodeProps<T> = T & {
	node: INode<any>,
	path: ModelPath,
	value: any,
	lang: string,
	version: VersionId,
	states: BlockStateRegistry,
	ctx: Record<string, any>,
}

export function FullNode({ model, lang, version, blockStates }: { model: DataModel, lang: string, version: VersionId, blockStates: BlockStateRegistry }) {
	const path = new ModelPath(model)
	const [prefix, suffix, body] = model.schema.hook(renderHtml, path, deepClone(model.data), lang, version, blockStates, {})
	return suffix?.props?.children.some((c: any) => c) ? <div class={`node ${model.schema.type(path)}-node`} data-category={model.schema.category(path)}>
		<div class="node-header">{prefix}{suffix}</div>
		<div class="node-body">{body}</div>
	</div> : body
}

const renderHtml: RenderHook = {
	base() {
		return [null, null, null]
	},

	boolean(params, path, value, lang, version, states, ctx) {
		return [null, <BooleanSuffix {...{...params, path, value, lang, version, states, ctx}} />, null]
	},

	choice({ choices, config, switchNode }, path, value, lang, version, states, ctx) {
		const choice = switchNode.activeCase(path, true) as typeof choices[number]
		const contextPath = (config?.context) ? new ModelPath(path.getModel(), new Path(path.getArray(), [config.context])) : path
		const [prefix, suffix, body] = choice.node.hook(this, contextPath, value, lang, version, states, ctx)
		if (choices.length === 1) {
			return [prefix, suffix, body]
		}
		const choiceContextPath = config?.choiceContext ? new Path([], [config.choiceContext]) : config?.context ? new Path([], [config.context]) : path
		const set = (type: string) => {
			const c = choices.find(c => c.type === type) ?? choice
			const def = c.node.default()
			const newValue = c.change
				? c.change(DataModel.unwrapLists(value))
				: config.choiceContext === 'feature' && def?.type === 'minecraft:decorated' ? def.config.feature : def
			path.model.set(path, DataModel.wrapLists(newValue))
		}
		const inject = <select value={choice.type} onChange={(e) => set((e.target as HTMLSelectElement).value)}>
			{choices.map(c => <option value={c.type}>
				{pathLocale(lang, choiceContextPath.contextPush(c.type))}
			</option>)}
		</select>
		return [prefix, <>{inject}{suffix}</>, body]
	},

	list({ children, config }, path, value, lang, version, states, ctx) {
		const { expand, collapse, isToggled } = useToggles()
		const [maxShown, setMaxShown] = useState(50)

		const context = path.getContext().join('.')
		if (fixedLists.includes(context)) {
			const prefix = <>
				{[...Array(config.maxLength!)].map((_, i) =>
					<ErrorPopup lang={lang} path={path.modelPush(i)} />)}
				<div class="fixed-list"></div>
			</>
			const suffix = <>{[...Array(config.maxLength)].map((_, i) => {
				const child = children.hook(this, path.modelPush(i), value?.[i]?.node, lang, version, states, ctx)
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
		const suffix = <button class="add tooltipped tip-se" aria-label={localize(lang, 'add_top')} onClick={onAdd}>{Octicon.plus_circle}</button>
		const body = <>
			{(value && Array.isArray(value)) && value.map(({ node: cValue, id: cId }, index) => {
				if (index === maxShown) {
					return <div class="node node-header">
						<label>{localize(lang, 'entries_hidden', `${value.length - maxShown}`)}</label>
						<button onClick={() => setMaxShown(Math.min(maxShown + 50, value.length))}>{localize(lang, 'entries_hidden.more', '50')}</button>
						<button onClick={() => setMaxShown(value.length)}>{localize(lang, 'entries_hidden.all')}</button>
					</div>
				}
				if (index > maxShown) {
					return null
				}
				const pathWithContext = (config?.context) ? new ModelPath(path.getModel(), new Path(path.getArray(), [config.context])) : path
				const cPath = pathWithContext.push(index).contextPush('entry')
				const canToggle = children.type(cPath) === 'object'
				const toggle = isToggled(cId)

				let label: undefined | string | JSX.Element
				if (itemPreviewFields.includes(cPath.getContext().join('.'))) {
					if (isObject(cValue) && typeof cValue.type === 'string' && cValue.type.replace(/^minecraft:/, '') === 'item' && typeof cValue.name === 'string') {
						let itemStack: ItemStack | undefined
						try {
							itemStack = new ItemStack(Identifier.parse(cValue.name), 1)
						} catch (e) {}
						if (itemStack !== undefined) {
							label = <ItemDisplay item={itemStack} />
						}
					}
				}

				if (canToggle && (toggle === false || (toggle === undefined && value.length > 20))) {
					return <div class="node node-header" data-category={children.category(cPath)}>
						<ErrorPopup lang={lang} path={cPath} nested />
						<button class="toggle tooltipped tip-se" aria-label={`${localize(lang, 'expand')}\n${localize(lang, 'expand_all', 'Ctrl')}`} onClick={expand(cId)}>{Octicon.chevron_right}</button>
						<label>{label ?? pathLocale(lang, cPath, `${index}`)}</label>
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
				const actions: MenuAction[] = [
					{
						icon: 'duplicate',
						label: 'duplicate',
						onSelect: () => {
							const v = [...path.get()]
							v.splice(index, 0, { id: hexId(), node: deepClone(cValue) })
							path.model.set(path, v)
						},
					},
				]
				return <MemoedTreeNode key={cId} label={label} path={cPath} schema={children} value={cValue} {...{lang, version, states, actions}} ctx={{...ctx, index: (index === 0 ? 1 : 0) + (index === value.length - 1 ? 2 : 0)}}>
					{canToggle && <button class="toggle tooltipped tip-se" aria-label={`${localize(lang, 'collapse')}\n${localize(lang, 'collapse_all', 'Ctrl')}`} onClick={collapse(cId)}>{Octicon.chevron_down}</button>}
					<button class="remove tooltipped tip-se" aria-label={localize(lang, 'remove')} onClick={onRemove}>{Octicon.trashcan}</button>
					{value.length > 1 && <div class="node-move">
						<button class="move tooltipped tip-se" aria-label={localize(lang, 'move_up')} onClick={onMoveUp} disabled={index === 0}>{Octicon.chevron_up}</button>
						<button class="move tooltipped tip-se" aria-label={localize(lang, 'move_down')} onClick={onMoveDown} disabled={index === value.length - 1}>{Octicon.chevron_down}</button>
					</div>}
				</MemoedTreeNode>
			})}
			{(value && value.length > 0 && value.length <= maxShown) && <div class="node node-header">
				<button class="add tooltipped tip-se" aria-label={localize(lang, 'add_bottom')} onClick={onAddBottom}>{Octicon.plus_circle}</button>
			</div>}
		</>
		return [null, suffix, body]
	},

	map({ children, keys, config }, path, value, lang, version, states, ctx) {
		const { expand, collapse, isToggled } = useToggles()

		const keyPath = new ModelPath(keysModel, new Path([hashString(path.toString())], path.contextArr))
		const onAdd = () => {
			const key = keyPath.get()
			if (path.model.get(path.push(key)) === undefined) {
				path.model.set(path.push(key), DataModel.wrapLists(children.default()))
			}
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
			return ObjectNode(Object.fromEntries(properties)).hook(this, path, value, lang, version, states, ctx)
		}
		const suffix = <>
			{keysSchema.hook(this, keyPath, keyPath.get() ?? '', lang, version, states, ctx)[1]}
			<button class="add tooltipped tip-se" aria-label={localize(lang, 'add')} onClick={onAdd}>{Octicon.plus_circle}</button>
		</>
		const body = <>
			{typeof value === 'object' && Object.entries(value).map(([key, cValue]) => {
				const pathWithContext = (config?.context) ? new ModelPath(path.getModel(), new Path(path.getArray(), [config.context])) : path
				const cPath = pathWithContext.modelPush(key)
				const canToggle = children.type(cPath) === 'object'
				const toggle = isToggled(key)
				if (canToggle && (toggle === false || (toggle === undefined && value.length > 20))) {
					return <div class="node node-header" data-category={children.category(cPath)}>
						<ErrorPopup lang={lang} path={cPath} nested />
						<button class="toggle tooltipped tip-se" aria-label={`${localize(lang, 'expand')}\n${localize(lang, 'expand_all', 'Ctrl')}`} onClick={expand(key)}>{Octicon.chevron_right}</button>
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
				return <MemoedTreeNode key={key} schema={cSchema} path={cPath} value={cValue} {...{lang, version, states, ctx}} label={key}>
					{canToggle && <button class="toggle tooltipped tip-se" aria-label={`${localize(lang, 'collapse')}\n${localize(lang, 'collapse_all', 'Ctrl')}`} onClick={collapse(key)}>{Octicon.chevron_down}</button>}
					<button class="remove tooltipped tip-se" aria-label={localize(lang, 'remove')} onClick={onRemove}>{Octicon.trashcan}</button>
				</MemoedTreeNode>
			})}
		</>
		return [null, suffix, body]
	},

	number(params, path, value, lang, version, states, ctx) {
		return [null, <NumberSuffix {...{...params, path, value, lang, version, states, ctx}} />, null]
	},

	object({ node, config, getActiveFields, getChildModelPath }, path, value, lang, version, states, ctx) {
		const { expand, collapse, isToggled } = useToggles()

		if (path.getArray().length == 0 && isDecorated(config.context, value)) {
			const { wrapper, fields } = createDecoratorsWrapper(getActiveFields(path), path, value)
			value = wrapper.data
			getActiveFields = () => fields
			getChildModelPath = (path, key) => new ModelPath(wrapper, new Path(path.getArray(), ['feature'])).push(key)
		}

		let prefix: JSX.Element | null = null
		let suffix: JSX.Element | null = null
		if (node.optional()) {
			if (value === undefined) {
				const onExpand = () => path.set(DataModel.wrapLists(node.default()))
				suffix = <button class="node-collapse closed tooltipped tip-se" aria-label={localize(lang, 'expand')} onClick={onExpand}>{Octicon.plus_circle}</button>
			} else {
				const onCollapse = () => path.set(undefined)
				suffix = <button class="node-collapse open tooltipped tip-se" aria-label={localize(lang, 'remove')} onClick={onCollapse}>{Octicon.trashcan}</button>
			}
		}
		const context = path.getContext().join('.')
		if (collapsableFields.includes(context) || collapsedFields.includes(context)) {
			const toggled = isToggled('')
			const expanded = collapsedFields.includes(context) ? toggled : !toggled
			prefix = <>
				<button class="toggle tooltipped tip-se" aria-label={localize(lang, expanded ? 'collapse' : 'expand')} onClick={toggled ? collapse('') : expand('')}>{expanded ? Octicon.chevron_down : Octicon.chevron_right}</button>
			</>
			if (!expanded) {
				return [prefix, suffix, null]
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
						const [cPrefix, cSuffix, cBody] = child.hook(this, cPath, value[key], lang, version, states, newCtx)
						const isFlattened = child.type(cPath) === 'object' && flattenedFields.includes(context)
						const isInlined = inlineFields.includes(context)
						if (isFlattened || isInlined) {
							prefix = <>{prefix}<ErrorPopup lang={lang} path={cPath} /><HelpPopup lang={lang} path={cPath} />{cPrefix}</>
							suffix = <>{suffix}{cSuffix}</>
							return isFlattened ? cBody : null
						}
						return <MemoedTreeNode key={key} schema={child} path={cPath} value={value[key]} {...{lang, version, states, ctx: newCtx}} />
					})
			}
		</>
		return [prefix, suffix, body]
	},

	string(params, path, value, lang, version, states, ctx) {
		return [null, <StringSuffix {...{...params, path, value, lang, version, states, ctx}} />, null]
	},
}

function Collapsed({ path, value }: { path: ModelPath, value: any, schema: INode<any> }) {
	const { locale } = useLocale()
	const context = path.getContext().join('.')
	switch (context) {
		case 'loot_table.pools.entry':
			const count = value?.entries?.length ?? 0
			return <label>{count} {count == 1 ? 'entry' : 'entries'}</label>
		case 'function.set_contents.entries.entry':
		case 'loot_pool.entries.entry':
			const name = value?.name?.replace(/^minecraft:/, '') ?? value?.type?.replace(/^minecraft:/, '')
			const weight = value?.weight || undefined
			return <>
				<label>{name}</label>
				{weight !== undefined && <label class="tooltipped tip-se" aria-label={locale('weight')}>{weight}</label>}
			</>
	}
	for (const child of Object.values(value ?? {})) {
		if (typeof child === 'string') {
			return <label>{child.replace(/^minecraft:/, '')}</label>
		}
	}
	return null
}

function useToggles() {
	const [toggleState, setToggleState] = useState(new Map<string, boolean>())
	const [toggleAll, setToggleAll] = useState<boolean | undefined>(undefined)

	const expand = (key: string) => (evt: MouseEvent) => {
		if (evt.ctrlKey) {
			setToggleState(new Map())
			setToggleAll(true)
		} else {
			setToggleState(state => new Map(state.set(key, true)))
		}
	}
	const collapse = (key: string) => (evt: MouseEvent) => {
		if (evt.ctrlKey) {
			setToggleState(new Map())
			setToggleAll(false)
		} else {
			setToggleState(state => new Map(state.set(key, false)))
		}
	}
	
	const isToggled = (key: string) => {
		if (!(toggleState instanceof Map)) return false
		return toggleState.get(key) ?? toggleAll
	}

	return { expand, collapse, isToggled }
}

function BooleanSuffix({ path, node, value, lang }: NodeProps<BooleanHookParams>) {
	const set = (target: boolean) => {
		path.model.set(path, node.optional() && value === target ? undefined : target)
	}
	return <>
		<button class={value === false ? 'selected' : ''} onClick={() => set(false)}>{localize(lang, 'false')}</button>
		<button class={value === true ? 'selected' : ''} onClick={() => set(true)}>{localize(lang, 'true')}</button>
	</>
}

function NumberSuffix({ path, config, integer, value, lang }: NodeProps<NumberHookParams>) {
	const onChange = (evt: Event) => {
		const value = (evt.target as HTMLInputElement).value
		const parsed = integer ? parseInt(value) : parseFloat(value)
		path.model.set(path, parsed)
	}
	const onColor = (evt: Event) => {
		const value = (evt.target as HTMLInputElement).value
		const parsed = parseInt(value.slice(1), 16)
		path.model.set(path, parsed)
	}
	return <>
		<input type="text" value={value ?? ''} onBlur={onChange} onKeyDown={evt => {if (evt.key === 'Enter') onChange(evt)}} />
		{config?.color && <input type="color" value={'#' + (value?.toString(16).padStart(6, '0') ?? '000000')} onChange={onColor} />}
		{config?.color && <button onClick={() => path.set(generateColor())} class="tooltipped tip-se" aria-label={localize(lang, 'generate_new_color')}>{Octicon.sync}</button>}
		{['dimension.generator.seed', 'dimension.generator.biome_source.seed', 'world_settings.seed', 'structure_placement.salt'].includes(path.getContext().join('.')) && <button onClick={() => newSeed(path.model)} class="tooltipped tip-se" aria-label={localize(lang, 'generate_new_seed')}>{Octicon.sync}</button>}
	</>
}

function StringSuffix({ path, getValues, config, node, value, lang, version, states }: NodeProps<StringHookParams>) {
	const context = path.getContext().join('.')
	const onChange = (evt: Event) => {
		evt.stopPropagation()
		const newValue = (evt.target as HTMLSelectElement).value
		if (newValue === value) return
		// Hackfix to support switching between checkerboard and multi_noise biome sources
		if (context === 'dimension.generator.biome_source.type') {
			const biomeSourceType = newValue.replace(/^minecraft:/, '')
			const biomePath = path.pop().push('biomes')
			const biomes = biomePath.get()
			if (biomeSourceType === 'multi_noise') {
				const newBiomes = Array.isArray(biomes)
					? biomes.flatMap((b: any) => {
						if (typeof b.node !== 'string') return []
						return [{ node: { biome: b.node }}]
					})
					: [{ node: { biome: 'minecraft:plains' } }]
				path.model.set(biomePath, newBiomes, true)
			} else if (biomeSourceType === 'checkerboard') {
				const newBiomes = typeof biomes === 'string'
					? biomes
					: Array.isArray(biomes)
						? biomes.flatMap((b: any) => {
							if (typeof b.node !== 'object' || b.node === null || typeof b.node.biome !== 'string') return []
							return [{ node: b.node.biome }]
						})
						: [{ node: 'minecraft:plains' }]
				path.model.set(biomePath, newBiomes, true)
			}
		}
		path.model.set(path, newValue.length === 0 ? undefined : newValue)
	}
	const values = getValues()
	const id = !isEnum(config) && config?.validator === 'resource' && typeof config.params.pool === 'string' ? config.params.pool : undefined

	if (nbtFields.includes(context)) {
		return <textarea value={value ?? ''} onBlur={onChange}></textarea>
	} else if ((isEnum(config) && !config.additional && !datalistEnums.includes(context)) || selectRegistries.includes(context)) {
		let childPath = new Path([])
		if (isEnum(config) && typeof config.enum === 'string') {
			childPath = childPath.contextPush(config.enum)
		} else if (id) {
			childPath = childPath.contextPush(id)
		} else if (isEnum(config)) {
			childPath = path
		}
		return <select value={value ?? ''} onChange={onChange}>
			{node.optional() && <option value="">{localize(lang, 'unset')}</option>}
			{values.map(v => <option value={v}>
				{pathLocale(lang, childPath.contextPush(v.replace(/^minecraft:/, '')))}
			</option>)}
		</select>
	} else if (!isEnum(config) && config?.validator === 'block_state_key') {
		const blockState = states?.[relativePath(path, config.params.id).get()]
		const values = Object.keys(blockState?.properties ?? {})
		return <select value={value ?? ''} onChange={onChange}>
			{values.map(v => <option>{v}</option>)}
		</select>
	} else {
		const { biomeColors, setBiomeColor } = useStore()
		const fullId = typeof value === 'string' ? value.includes(':') ? value : 'minecraft:' + value : 'unknown'
		const datalistId = hexId()
		const gen = id ? findGenerator(id) : undefined
		return <>
			<input value={value ?? ''} onBlur={onChange} onKeyDown={evt => {if (evt.key === 'Enter') onChange(evt)}}
				list={values.length > 0 ? datalistId : ''} />
			{values.length > 0 && <datalist id={datalistId}>
				{values.map(v => <option value={v} />)}
			</datalist>}
			{['generator_biome.biome'].includes(context) && <input type="color" value={rgbToHex(biomeColors[fullId] ?? VanillaColors[fullId] ?? stringToColor(fullId))} onChange={v => setBiomeColor(fullId, hexToRgb(v.currentTarget.value))}></input>}
			{['attribute_modifier.id', 'text_component_object.hoverEvent.show_entity.contents.id'].includes(context) && <button onClick={() => path.set(generateUUID())} class="tooltipped tip-se" aria-label={localize(lang, 'generate_new_uuid')}>{Octicon.sync}</button>}
			{gen && values.includes(value) && value.startsWith('minecraft:') &&
				<a href={`/${gen.url}/?version=${version}&preset=${value.replace(/^minecraft:/, '')}`} class="tooltipped tip-se" aria-label={localize(lang, 'follow_reference')}>{Octicon.link_external}</a>}
		</>
	}
}

type MenuAction = {
	label: string,
	description?: string,
	icon: keyof typeof Octicon,
	onSelect: () => unknown,
}

type TreeNodeProps = {
	schema: INode<any>,
	path: ModelPath,
	value: any,
	lang: string,
	version: VersionId,
	states: BlockStateRegistry,
	ctx: Record<string, any>,
	compare?: any,
	label?: string | ComponentChildren,
	actions?: MenuAction[],
	children?: ComponentChildren,
}
function TreeNode({ label, schema, path, value, lang, version, states, ctx, actions, children }: TreeNodeProps) {
	const type = schema.type(path)
	const category = schema.category(path)
	const context = path.getContext().join('.')

	const [active, setActive] = useFocus()
	const onContextMenu = (evt: MouseEvent) => {
		evt.preventDefault()
		setActive()
	}

	const newCtx: Record<string, any> = { ...ctx, depth: (ctx.depth ?? 0) + 1 }
	delete newCtx.index
	const [prefix, suffix, body] = schema.hook(renderHtml, path, value, lang, version, states, newCtx)
	return <div class={`node ${type}-node`} data-category={category}>
		<div class="node-header" onContextMenu={onContextMenu}>
			<ErrorPopup lang={lang} path={path} />
			<HelpPopup lang={lang} path={path} />
			{children}
			{prefix}
			<label>
				{label ?? pathLocale(lang, path, `${path.last()}`)}
				{active && <div class="node-menu">
					{actions?.map(a => <div key={a.label} class="menu-item">
						<Btn icon={a.icon} tooltip={localize(lang, a.label)} tooltipLoc="se" onClick={() => a.onSelect()}/>
						<span>{a.description ?? localize(lang, a.label)}</span>
					</div>)}
					<div class="menu-item">
						<Btn icon="clippy" tooltip={localize(lang, 'copy_context')} tooltipLoc="se" onClick={() => navigator.clipboard.writeText(context)} />
						<span>{context}</span>
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
		const result = localize(lang, key, ...params)
		if (key !== result) {
			return result
		}
	}
	return ctx[ctx.length - 1]
}

function ErrorPopup({ lang, path, nested }: { lang: string, path: ModelPath, nested?: boolean }) {
	if (path.model instanceof ModelWrapper) {
		path = path.model.map(path).withModel(path.model)
	}
	const e = nested
		?	path.model.errors.getAll().filter(e => e.path.startsWith(path))
		: path.model.errors.get(path, true)
	if (e.length === 0) return null
	const message = localize(lang, e[0].error, ...(e[0].params ?? []))
	return popupIcon('node-error', 'issue_opened', message)
}

function HelpPopup({ lang, path }: { lang: string, path: Path }) {
	const key = path.contextPush('help').getContext().join('.')
	const message = localize(lang, key)
	if (message === key) return null
	return popupIcon('node-help', 'info', message)
}

const popupIcon = (type: string, icon: keyof typeof Octicon, popup: string) => {
	const [active, setActive] = useFocus()

	return <div class={`node-icon ${type}${active ? ' show' : ''}`} onClick={() => setActive()}>
		{Octicon[icon]}
		<span class="icon-popup">{popup}</span>
	</div>
}

function isDecorated(context: string | undefined, value: any) {
	return context === 'feature'
		&& value?.type?.replace(/^minecraft:/, '') === 'decorated'
		&& isObject(value?.config)
}

function createDecoratorsWrapper(originalFields: NodeChildren, path: ModelPath, value: any) {
	const decorators: any[] = []
	const feature = iterateNestedDecorators(value, decorators)
	const fields = {
		type: originalFields.type,
		config: ObjectNode({
			decorators: ListNode(CachedDecorator),
			feature: CachedFeature,
		}, { context: 'feature.decorated' }),
	}
	const schema = ObjectNode(fields, { context: 'feature' })
	const featurePath = new Path(['config', 'feature'])
	const decoratorsPath = new Path(['config', 'decorators'])
	const model = path.getModel()
	const wrapper: ModelWrapper = new ModelWrapper(schema, path => {
		if (path.startsWith(featurePath)) {
			return new Path([...[...Array(decorators.length - 1)].flatMap(() => ['config', 'feature']), ...path.modelArr])
		} else if (path.startsWith(decoratorsPath)) {
			if (path.modelArr.length === 2) {
				return new Path([])
			}
			const index = path.modelArr[2]
			if (typeof index === 'number') {
				return new Path([...[...Array(index)].flatMap(() => ['config', 'feature']), 'config', 'decorator', ...path.modelArr.slice(3)])
			}
		}
		return path
	}, path => {
		if (path.equals(decoratorsPath)) {
			const newDecorators: any[] = []
			iterateNestedDecorators(model.data, newDecorators)
			return newDecorators
		}
		return model.get(wrapper.map(path))
	}, (path, value, silent) => {
		if (path.startsWith(featurePath)) {
			const newDecorators: any[] = []
			iterateNestedDecorators(model.data, newDecorators)
			const newPath =new Path([...[...Array(newDecorators.length - 1)].flatMap(() => ['config', 'feature']), ...path.modelArr])
			return model.set(newPath, value, silent)
		} else if (path.startsWith(decoratorsPath)) {
			const index = path.modelArr[2]
			if (path.modelArr.length === 2) {
				const feature = wrapper.get(featurePath)
				return model.set(new Path(), produceNestedDecorators(feature, value), silent)
			} else if (typeof index === 'number') {
				if (path.modelArr.length === 3 && value === undefined) {
					const feature = wrapper.get(featurePath)
					const newDecorators: any[] = []
					iterateNestedDecorators(model.data, newDecorators)
					newDecorators.splice(index, 1)
					const newValue = produceNestedDecorators(feature, newDecorators)
					return model.set(new Path(), newValue, silent)
				} else {
					const newPath = new Path([...[...Array(index)].flatMap(() => ['config', 'feature']), 'config', 'decorator', ...path.modelArr.slice(3)])
					return model.set(newPath, value, silent)
				}
			}
		}
		model.set(path, value, silent)
	})
	wrapper.data = {
		type: model.data.type,
		config: {
			decorators,
			feature,
		},
	}
	wrapper.errors = model.errors
	return { fields, wrapper }
}

function iterateNestedDecorators(value: any, decorators: any[]): any {
	if (value?.type?.replace(/^minecraft:/, '') !== 'decorated') {
		return value
	}
	if (!isObject(value?.config)) {
		return value
	}
	decorators.push({ id: decorators.length, node: value.config.decorator })
	return iterateNestedDecorators(value.config.feature ?? '', decorators)
}

function produceNestedDecorators(feature: any, decorators: any[]): any {
	if (decorators.length === 0) return feature
	return {
		type: 'minecraft:decorated',
		config: {
			decorator: decorators.shift().node,
			feature: produceNestedDecorators(feature, decorators),
		},
	}
}

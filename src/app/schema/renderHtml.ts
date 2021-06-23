import type { EnumOption, Hook, ValidationOption } from '@mcschema/core'
import { DataModel, MapNode, ModelPath, Path, StringNode } from '@mcschema/core'
import type { Localize } from '../Locales'
import type { VersionId } from '../Schemas'
import { hexId, htmlEncode } from '../Utils'
import type { Mounter } from './Mounter'
import { Octicon } from './Octicon'

export type TreeProps = {
	loc: Localize,
	mounter: Mounter,
	version: VersionId,
}

const selectRegistries = ['loot_table.type', 'loot_entry.type', 'function.function', 'condition.condition', 'criterion.trigger', 'dimension.generator.type', 'dimension.generator.biome_source.type', 'carver.type', 'feature.type', 'decorator.type', 'feature.tree.minimum_size.type', 'block_state_provider.type', 'trunk_placer.type', 'foliage_placer.type', 'tree_decorator.type', 'int_provider.type', 'float_provider.type', 'height_provider.type', 'structure_feature.type', 'surface_builder.type', 'processor.processor_type', 'rule_test.predicate_type', 'pos_rule_test.predicate_type', 'template_element.element_type', 'block_placer.type']
const hiddenFields = ['number_provider.type', 'score_provider.type', 'nbt_provider.type', 'int_provider.type', 'float_provider.type', 'height_provider.type']
const flattenedFields = ['feature.config', 'decorator.config', 'int_provider.value', 'float_provider.value', 'block_state_provider.simple_state_provider.state', 'block_state_provider.rotated_block_provider.state', 'block_state_provider.weighted_state_provider.entries.entry.data', 'rule_test.block_state', 'structure_feature.config', 'surface_builder.config', 'template_pool.elements.entry.element']
const inlineFields = ['loot_entry.type', 'function.function', 'condition.condition', 'criterion.trigger', 'dimension.generator.type', 'dimension.generator.biome_source.type', 'feature.type', 'decorator.type', 'block_state_provider.type', 'feature.tree.minimum_size.type', 'trunk_placer.type', 'feature.tree.foliage_placer', 'tree_decorator.type', 'block_placer.type', 'rule_test.predicate_type', 'processor.processor_type', 'template_element.element_type']

/**
 * Secondary model used to remember the keys of a map
 */
const keysModel = new DataModel(MapNode(
	StringNode(),
	StringNode()
), { historyMax: 0 })

/**
 * Renders the node and handles events to update the model
 * @returns string HTML representation of this node using the given data
 */
export const renderHtml: Hook<[any, TreeProps], [string, string, string]> = {
	base() {
		return ['', '', '']
	},

	boolean({ node }, path, value, { loc, mounter }) {
		const onFalse = mounter.onClick(() => {
			path.model.set(path, node.optional() && value === false ? undefined : false)
		})
		const onTrue = mounter.onClick(() => {
			path.model.set(path, node.optional() && value === true ? undefined : true)
		})
		return ['', `<button${value === false ? ' class="selected"' : ' '} 
				data-id="${onFalse}">${htmlEncode(loc('false'))}</button>
			<button${value === true ? ' class="selected"' : ' '} 
				data-id="${onTrue}">${htmlEncode(loc('true'))}</button>`, '']
	},

	choice({ choices, config, switchNode }, path, value, { loc, mounter, version }) {
		const choice = switchNode.activeCase(path, true)
		const pathWithContext = (config?.context) ? new ModelPath(path.getModel(), new Path(path.getArray(), [config.context])) : path
		const pathWithChoiceContext = config?.choiceContext ? new Path([], [config.choiceContext]) : config?.context ? new Path([], [config.context]) : path

		const [prefix, suffix, body] = choice.node.hook(this, pathWithContext, value, { loc, mounter, version })
		if (choices.length === 1) {
			return [prefix, suffix, body]
		}

		const inputId = mounter.register(el => {
			(el as HTMLSelectElement).value = choice.type
			el.addEventListener('change', () => {
				const c = choices.find(c => c.type === (el as HTMLSelectElement).value) ?? choice
				path.model.set(path, c.change ? c.change(value) : c.node.default())
			})
		})
		const inject = `<select data-id="${inputId}">
			${choices.map(c => `<option value="${htmlEncode(c.type)}">
				${htmlEncode(pathLocale(loc, pathWithChoiceContext.contextPush(c.type)))}
			</option>`).join('')}
		</select>`

		return [prefix, inject + suffix, body]
	},

	list({ children }, path, value, { loc, mounter, version }) {
		const onAdd = mounter.onClick(() => {
			if (!Array.isArray(value)) value = []
			path.model.set(path, [children.default(), ...value])
		})
		const onAddBottom = mounter.onClick(() => {
			if (!Array.isArray(value)) value = []
			path.model.set(path, [...value, children.default()])
		})
		const suffix = `<button class="add" data-id="${onAdd}" aria-label="${loc('button.add')}">${Octicon.plus_circle}</button>`

		let body = ''
		if (Array.isArray(value)) {
			body = value.map((childValue, index) => {
				const removeId = mounter.onClick(() => path.model.set(path.push(index), undefined))
				const childPath = path.push(index).contextPush('entry')
				const category = children.category(childPath)
				const [cPrefix, cSuffix, cBody] = children.hook(this, childPath, childValue, { loc, mounter, version })
				return `<div class="node-entry"><div class="node ${children.type(childPath)}-node" ${category ? `data-category="${htmlEncode(category)}"` : ''}>
					<div class="node-header">
						${error(loc, childPath, mounter)}
						${help(loc, childPath, mounter)}
						<button class="remove" data-id="${removeId}" aria-label="${loc('button.remove')}">${Octicon.trashcan}</button>
						${cPrefix}
						<label ${contextMenu(loc, childPath, mounter)}>
							${htmlEncode(pathLocale(loc, childPath, `${index}`))}
						</label>
						${cSuffix}
					</div>
					${cBody ? `<div class="node-body">${cBody}</div>` : ''}
					</div>
				</div>`
			}).join('')
			if (value.length > 2) {
				body += `<div class="node-entry">
					<div class="node node-header">
						<button class="add" data-id="${onAddBottom}" aria-label="${loc('button.add')}">${Octicon.plus_circle}</button>
					</div>
				</div>`
			}
		}
		return ['', suffix, body]
	},

	map({ children, keys }, path, value, { loc, mounter, version }) {
		const keyPath = new ModelPath(keysModel, new Path([hashString(path.toString())]))
		const onAdd = mounter.onClick(() => {
			const key = keyPath.get()
			path.model.set(path.push(key), children.default())
		})
		const keyRendered = keys.hook(this, keyPath, keyPath.get() ?? '', { loc, mounter, version })
		const suffix = keyRendered[1] + `<button class="add" data-id="${onAdd}" aria-label="${loc('button.add')}">${Octicon.plus_circle}</button>`
		let body = ''
		if (typeof value === 'object' && value !== undefined) {
			body = Object.keys(value)
				.map(key => {
					const onRemove = mounter.onClick(() => path.model.set(path.push(key), undefined))
					const childPath = path.modelPush(key)
					const category = children.category(childPath)
					const [cPrefix, cSuffix, cBody] = children.hook(this, childPath, value[key], { loc, mounter, version })
					return `<div class="node-entry"><div class="node ${children.type(childPath)}-node" ${category ? `data-category="${htmlEncode(category)}"` : ''}>
						<div class="node-header">
							${error(loc, childPath, mounter)}
							${help(loc, childPath, mounter)}
							<button class="remove" data-id="${onRemove}" aria-label="${loc('button.remove')}">${Octicon.trashcan}</button>
							${cPrefix}
							<label ${contextMenu(loc, childPath, mounter)}>
								${htmlEncode(key)}
							</label>
							${cSuffix}
						</div>
						${cBody ? `<div class="node-body">${cBody}</div>` : ''}
						</div>
					</div>`
				})
				.join('')
		}
		return ['', suffix, body]
	},

	number({ integer, config }, path, value, { mounter }) {
		const onChange = mounter.onChange(el => {
			const value = (el as HTMLInputElement).value
			const parsed = config?.color
				? parseInt(value.slice(1), 16)
				: integer ? parseInt(value) : parseFloat(value)
			path.model.set(path, parsed)
		})
		if (config?.color) {
			const hex = (value?.toString(16).padStart(6, '0') ?? '000000')
			return ['', `<input type="color" data-id="${onChange}" value="#${hex}">`, '']
		}
		return ['', `<input data-id="${onChange}" value="${value ?? ''}">`, '']
	},

	object({ node, getActiveFields, getChildModelPath }, path, value, { loc, mounter, version }) {
		let suffix = ''
		if (node.optional()) {
			if (value === undefined) {
				suffix = `<button class="collapse closed" data-id="${mounter.onClick(() => path.model.set(path, node.default()))}" aria-label="${loc('button.expand')}">${Octicon.plus_circle}</button>`
			} else {
				suffix = `<button class="collapse open" data-id="${mounter.onClick(() => path.model.set(path, undefined))}" aria-label="${loc('button.collapse')}">${Octicon.trashcan}</button>`
			}
		}
		let body = ''
		if (typeof value === 'object' && value !== undefined && (!(node.optional() && value === undefined))) {
			const activeFields = getActiveFields(path)
			const activeKeys = Object.keys(activeFields)
				.filter(k => activeFields[k].enabled(path))
			body = activeKeys.map(k => {
				const field = activeFields[k]
				const childPath = getChildModelPath(path, k)
				const context = childPath.getContext().join('.')
				if (hiddenFields.includes(context)) {
					return ''
				}

				const category = field.category(childPath)
				const [cPrefix, cSuffix, cBody] = field.hook(this, childPath, value[k], { loc, mounter, version })
				if (field.type(childPath) === 'object' && flattenedFields.includes(context)) {
					suffix += cSuffix
					return cBody
				}
				if (inlineFields.includes(context)) {
					suffix += cSuffix
					return ''
				}
				return `<div class="node ${field.type(childPath)}-node ${cBody ? '' : 'no-body'}" ${category ? `data-category="${htmlEncode(category)}"` : ''}>
					<div class="node-header">
						${error(loc, childPath, mounter)}
						${help(loc, childPath, mounter)}
						${cPrefix}
						<label ${contextMenu(loc, childPath, mounter)}>
							${pathLocale(loc, childPath)}
						</label>
						${cSuffix}
					</div>
					${cBody ? `<div class="node-body">${cBody}</div>` : ''}
				</div>`
			})
				.join('')
		}
		return ['', suffix, body]
	},

	string({ node, getValues, config }, path, value, { loc, mounter }) {
		const inputId = mounter.register(el => {
			(el as HTMLSelectElement).value = value ?? ''
			el.addEventListener('change', evt => {
				const newValue = (el as HTMLSelectElement).value
				path.model.set(path, newValue.length === 0 ? undefined : newValue)
				evt.stopPropagation()
			})
		})
		let suffix
		const values = getValues()
		if ((isEnum(config) && !config.additional)
			|| selectRegistries.includes(path.getContext().join('.'))	) {
			let context = new Path([])
			if (isEnum(config) && typeof config.enum === 'string') {
				context = context.contextPush(config.enum)
			} else if (!isEnum(config) && config?.validator === 'resource' && typeof config.params.pool === 'string') {
				context = context.contextPush(config.params.pool)
			}
			suffix = `<select data-id="${inputId}">
				${node.optional() ? `<option value="">${loc('unset')}</option>` : ''}
				${values.map(v => `<option value="${htmlEncode(v)}">
					${pathLocale(loc, context.contextPush(v.replace(/^minecraft:/, '')))}
				</option>`).join('')}
			</select>`
		} else {
			const datalistId = hexId()
			suffix = `<input data-id="${inputId}" ${values.length === 0 ? '' : `list="${datalistId}"`}>
				${values.length === 0 ? '' :
		`<datalist id="${datalistId}">
					${values.map(v =>
		`<option value="${htmlEncode(v)}">`
	).join('')}
		</datalist>`}`
		}
		return ['', suffix, '']
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
	return htmlEncode(ctx[ctx.length - 1])
}

function error(loc: Localize, path: ModelPath, mounter: Mounter) {
	const e = path.model.errors.get(path, true)
	if (e.length === 0) return ''
	const message = e[0].params ? loc(e[0].error, ...e[0].params) : loc(e[0].error)
	return popupIcon('node-error', 'issue_opened', htmlEncode(message), mounter)
}

function help(loc: Localize, path: Path, mounter: Mounter) {
	const key = path.contextPush('help').getContext().join('.')
	const message = loc(key)
	if (message === key) return ''
	return popupIcon('node-help', 'info', htmlEncode(message), mounter)
}

const popupIcon = (type: string, icon: keyof typeof Octicon, popup: string, mounter: Mounter) => {
	const onClick = mounter.onClick(el => {
		el.getElementsByTagName('span')[0].classList.add('show')
		document.body.addEventListener('click', () => {
			el.getElementsByTagName('span')[0].classList.remove('show')
		}, { capture: true, once: true })
	})
	return `<div class="node-icon ${type}" data-id="${onClick}">
		${Octicon[icon]}
		<span class="icon-popup">${popup}</span>
	</div>`
}

const contextMenu = (loc: Localize, path: ModelPath, mounter: Mounter) => {
	const id = mounter.register(el => {
		const openMenu = () => {
			const popup = document.createElement('div')
			popup.classList.add('node-menu')

			const message = loc(path.contextPush('help').getContext().join('.'))
			if (!message.endsWith('.help')) {
				popup.insertAdjacentHTML('beforeend', `<span class="menu-item help-item">${message}</span>`)
			}

			const context = path.getContext().join('.')
			popup.insertAdjacentHTML('beforeend', `
				<div class="menu-item">
					<span class="btn">${Octicon.clippy}</span>
					Context:&nbsp
					<span class="menu-item-context">${context}</span>
				</div>`)
			popup.querySelector('.menu-item .btn')?.addEventListener('click', () => {
				const inputEl = document.createElement('input')
				inputEl.value = context
				el.appendChild(inputEl) 
				inputEl.select()
				document.execCommand('copy')
				el.removeChild(inputEl)
			})

			el.appendChild(popup)
			document.body.addEventListener('click', () => {
				try {el.removeChild(popup)} catch (e) {}
			}, { capture: true, once: true })
			document.body.addEventListener('contextmenu', () => {
				try {el.removeChild(popup)} catch (e) {}
			}, { capture: true, once: true })
		}
		el.addEventListener('contextmenu', evt => {
			openMenu()
			evt.preventDefault()
		})
		let timer: any = null
		el.addEventListener('touchstart', () => {
			timer = setTimeout(() => {
				openMenu()
				timer = null
			}, 800)
		})
		el.addEventListener('touchend', () => {
			if (timer) {
				clearTimeout(timer)
				timer = null
			}
		})
	})
	return `data-id="${id}"`
}

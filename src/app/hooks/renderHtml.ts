import { Hook, ModelPath, Path, StringHookParams, ValidationOption, EnumOption, INode, DataModel, MapNode, StringNode, relativePath } from '@mcschema/core'
import { locale, segmentedLocale } from '../Locales'
import { Mounter } from '../views/View'
import { hexId, htmlEncode } from '../Utils'
import { suffixInjector } from './suffixInjector'
import { Octicon } from '../components/Octicon'
import { App, BlockStateRegistry } from '../App'
import { getFilterKey } from './getFilterKey'

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
export const renderHtml: Hook<[any, Mounter], [string, string, string]> = {
  base() {
    return ['', '', '']
  },

  boolean({ node }, path, value, mounter) {
    const onFalse = mounter.onClick(el => {
      path.model.set(path, node.optional() && value === false ? undefined : false)
    })
    const onTrue = mounter.onClick(el => {
      path.model.set(path, node.optional() && value === true ? undefined : true)
    })
    return ['', `<button${value === false ? ' class="selected"' : ' '} 
        data-id="${onFalse}">${htmlEncode(locale('false'))}</button>
      <button${value === true ? ' class="selected"' : ' '} 
        data-id="${onTrue}">${htmlEncode(locale('true'))}</button>`, '']
  },

  choice({ choices, config, switchNode }, path, value, mounter) {
    const choice = switchNode.activeCase(path, true)
    const pathWithContext = (config?.context) ? new ModelPath(path.getModel(), new Path(path.getArray(), [config.context])) : path
    const pathWithChoiceContext = config?.choiceContext ? new Path([], [config.choiceContext]) : config?.context ? new Path([], [config.context]) : path

    const [prefix, suffix, body] = choice.node.hook(this, pathWithContext, value, mounter)
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
        ${htmlEncode(pathLocale(pathWithChoiceContext.push(c.type)))}
      </option>`).join('')}
    </select>`

    return [prefix, inject + suffix, body]
  },

  list({ children }, path, value, mounter) {
    const onAdd = mounter.onClick(el => {
      if (!Array.isArray(value)) value = []
      path.model.set(path, [children.default(), ...value])
    })
    const onAddBottom = mounter.onClick(el => {
      if (!Array.isArray(value)) value = []
      path.model.set(path, [...value, children.default()])
    })
    const suffix = `<button class="add" data-id="${onAdd}">${Octicon.plus_circle}</button>`

    let body = ''
    if (Array.isArray(value)) {
      body = value.map((childValue, index) => {
        const removeId = mounter.onClick(el => path.model.set(path.push(index), undefined))
        const childPath = path.push(index).contextPush('entry')
        const category = children.category(childPath)
        const [cPrefix, cSuffix, cBody] = children.hook(this, childPath, childValue, mounter)
        return `<div class="node-entry"><div class="node ${children.type(childPath)}-node" ${category ? `data-category="${htmlEncode(category)}"` : ''}>
          <div class="node-header">
            ${error(childPath, mounter)}
            ${help(childPath, mounter)}
            <button class="remove" data-id="${removeId}">${Octicon.trashcan}</button>
            ${cPrefix}
            <label ${contextMenu(childPath, mounter)}>
              ${htmlEncode(pathLocale(path.contextPush('entry'), [`${index}`]))}
            </label>
            ${cSuffix}
          </div>
          ${cBody ? `<div class="node-body">${cBody}</div>` : ''}
          </div></div>`
      }).join('')
      if (value.length > 2) {
        body += `<div class="node-entry">
          <div class="node node-header">
            <button class="add" data-id="${onAddBottom}">${Octicon.plus_circle}</button>
          </div>
        </div>`
      }
    }
    return ['', suffix, body]
  },

  map({ keys, children, config }, path, value, mounter) {
    const keyPath = new ModelPath(keysModel, new Path([hashString(path.toString())]))
    const onAdd = mounter.onClick(el => {
      const key = keyPath.get()
      path.model.set(path.push(key), children.default())
    })
    let suffix = ''
    const blockState = (config.validation?.validator === 'block_state_map' ? BlockStateRegistry[relativePath(path, config.validation.params.id).get()] : null)
    if (!blockState || blockState.properties) {
      const keyRendered = (blockState
        ? StringNode(null!, { enum: Object.keys(blockState.properties ?? {}) })
        : keys).hook(this, keyPath, keyPath.get() ?? '', mounter)
      suffix = keyRendered[1] + `<button class="add" data-id="${onAdd}">${Octicon.plus_circle}</button>`
    }
    let body = ''
    if (typeof value === 'object' && value !== undefined) {
      body = Object.keys(value)
        .map(key => {
          const removeId = mounter.onClick(el => path.model.set(path.push(key), undefined))
          const childPath = path.modelPush(key)
          const category = children.category(childPath)
          const [cPrefix, cSuffix, cBody] = (blockState
            ? StringNode(null!, blockState.properties && { enum: blockState.properties[key] })
            : children).hook(this, childPath, value[key], mounter)
          return `<div class="node-entry"><div class="node ${children.type(childPath)}-node" ${category ? `data-category="${htmlEncode(category)}"` : ''}>
            <div class="node-header">
              ${error(childPath, mounter)}
              ${help(childPath, mounter)}
              <button class="remove" data-id="${removeId}">${Octicon.trashcan}</button>
              ${cPrefix}
              <label ${contextMenu(childPath, mounter)}>
                ${htmlEncode(key)}
              </label>
              ${cSuffix}
            </div>
            ${cBody ? `<div class="node-body">${cBody}</div>` : ''}
            </div></div>`
        })
        .join('')
    }
    return ['', suffix, body]
  },

  number({ integer, config }, path, value, mounter) {
    const onChange = mounter.onChange(el => {
      const value = (el as HTMLInputElement).value
      let parsed = config?.color
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

  object({ node, getActiveFields, getChildModelPath }, path, value, mounter) {
    let prefix = ''
    if (node.optional()) {
      if (value === undefined) {
        prefix = `<button class="collapse closed" data-id="${mounter.onClick(() => path.model.set(path, node.default()))}">${Octicon.plus_circle}</button>`
      } else {
        prefix = `<button class="collapse open" data-id="${mounter.onClick(() => path.model.set(path, undefined))}">${Octicon.trashcan}</button>`
      }
    }
    let suffix = ''
    let body = ''
    if (typeof value === 'object' && value !== undefined && (!(node.optional() && value === undefined))) {
      const activeFields = getActiveFields(path)
      const activeKeys = Object.keys(activeFields)
      const filterKey = path.modelArr.length === 0 ? null : node.hook(getFilterKey, path, path)
      if (filterKey && !(activeFields[filterKey].hidden && activeFields[filterKey].hidden())) {
        prefix += error(path.push(filterKey), mounter)
        prefix += help(path.push(filterKey), mounter)
        suffix += activeFields[filterKey].hook(this, path.push(filterKey), value[filterKey], mounter)[1]
      }
      const visibleKeys = (App.treeMinimized.get()
          ? activeKeys.filter(k => value[k] !== undefined)
          : activeKeys)
        .filter(k => filterKey !== k)
        .filter(k => activeFields[k].enabled(path))
      if (visibleKeys.length === 1 && activeFields[visibleKeys[0]].type(path.push(visibleKeys[0])) === 'object') {
        const newValue = value[visibleKeys[0]] ?? {}
        body = activeFields[visibleKeys[0]].hook(this, path.push(visibleKeys[0]), newValue, mounter)[2]
      } else {
        body = visibleKeys.map(k => {
          const field = activeFields[k]
          const childPath = getChildModelPath(path, k)
          const context = childPath.getContext().join('.')
          const fieldSettings = App.settings.fields.find(f => f?.path && context.endsWith(f.path))
          if ((field.hidden && field.hidden()) || fieldSettings?.hidden) return ''

          const category = field.category(childPath)
          const [cPrefix, cSuffix, cBody] = field.hook(this, childPath, value[k], mounter)
          return `<div class="node ${field.type(childPath)}-node ${cBody ? '' : 'no-body'}" ${category ? `data-category="${htmlEncode(category)}"` : ''}>
            <div class="node-header">
              ${error(childPath, mounter)}
              ${help(childPath, mounter)}
              ${cPrefix}
              <label ${contextMenu(childPath, mounter)}>
                ${htmlEncode(fieldSettings?.name ?? pathLocale(childPath))}
              </label>
              ${cSuffix}
            </div>
            ${cBody ? `<div class="node-body">${cBody}</div>` : ''}
            </div>`
        })
        .join('')
      }
    }
    suffix += node.hook(suffixInjector, path, mounter) || ''
    return ['', prefix + suffix, body]
  },

  string(params, path, value, mounter) {
    const inputId = mounter.register(el => {
      (el as HTMLSelectElement).value = value ?? ''
      el.addEventListener('change', evt => {
        const newValue = (el as HTMLSelectElement).value
        path.model.set(path, newValue.length === 0 ? undefined : newValue)
        evt.stopPropagation()
      })
    })
    const suffix = params.node.hook(suffixInjector, path, mounter) || ''
    return ['', rawString(params, path, inputId) + suffix, '']
  }
}

function isEnum(value?: ValidationOption | EnumOption): value is EnumOption {
  return !!(value as any)?.enum
}

function isValidator(value?: ValidationOption | EnumOption): value is ValidationOption {
  return !!(value as any)?.validator
}

function rawString({ node, getValues, config }: { node: INode } & StringHookParams, path: ModelPath, inputId?: string) {
  const values = getValues()
  if (isEnum(config) && !config.additional) {
    const contextPath = typeof config.enum === 'string' ?
      new Path(path.getArray(), [config.enum]) : path
    return selectRaw(node, contextPath, values, inputId)
  }
  if (config && isValidator(config)
    && config.validator === 'resource'
    && typeof config.params.pool === 'string'
    && values.length > 0) {
    const contextPath = new Path(path.getArray(), [config.params.pool])
    if (segmentedLocale(contextPath.contextPush(values[0]).getContext())) {
      return selectRaw(node, contextPath, values, inputId)
    }
  }
  const datalistId = hexId()
  return `<input data-id="${inputId}" ${values.length === 0 ? '' : `list="${datalistId}"`}>
  ${values.length === 0 ? '' :
      `<datalist id="${datalistId}">
    ${values.map(v =>
        `<option value="${htmlEncode(v)}">`
      ).join('')}
  </datalist>`}`
}

function selectRaw(node: INode, contextPath: Path, values: string[], inputId?: string) {
  return `<select data-id="${inputId}">
    ${node.optional() ? `<option value="">${htmlEncode(locale('unset'))}</option>` : ''}
    ${values.map(v => `<option value="${htmlEncode(v)}">
      ${htmlEncode(pathLocale(contextPath.contextPush(v)))}
    </option>`).join('')}
  </select>`
}
  
function hashString(str: string) {
  var hash = 0, i, chr;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
}

function pathLocale(path: Path, params?: string[]): string {
  return segmentedLocale(path.getContext(), params)
    ?? path.getContext()[path.getContext().length - 1] ?? ''
}

function error(p: ModelPath, mounter: Mounter) {
  const errors = p.model.errors.get(p, true)
  if (errors.length === 0) return ''
  return popupIcon('node-error', 'issue_opened', htmlEncode(locale(errors[0].error, errors[0].params)), mounter)
}

function help(path: ModelPath, mounter: Mounter) {
  const message = segmentedLocale(path.contextPush('help').getContext(), [], 6)
  if (message === undefined) return ''
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
    <span class="icon-popup">${popup}</span>${Octicon[icon]}
  </div>`
}

const contextMenu = (path: ModelPath, mounter: Mounter) => {
  const id = mounter.register(el => {
    const openMenu = () => {
      const popup = document.createElement('div')
      popup.classList.add('node-menu')

      const helpMessage = segmentedLocale(path.contextPush('help').getContext(), [], 6)
      if (helpMessage) popup.insertAdjacentHTML('beforeend', `<span class="menu-item help-item">${helpMessage}</span>`)

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

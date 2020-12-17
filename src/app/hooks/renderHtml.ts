import { Hook, ModelPath, Path, StringHookParams, ValidationOption, EnumOption, INode, DataModel, MapNode, StringNode } from '@mcschema/core'
import { locale, segmentedLocale } from '../Locales'
import { Mounter } from '../views/View'
import { hexId, htmlEncode } from '../Utils'
import { suffixInjector } from './suffixInjector'
import { Octicon } from '../components/Octicon'
import { App } from '../App'

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
            <label>${htmlEncode(pathLocale(path.contextPush('entry'), [`${index}`]))}</label>
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

  map({ keys, children }, path, value, mounter) {
    const keyPath = new ModelPath(keysModel, new Path([hashString(path.toString())]))
    const onAdd = mounter.onClick(el => {
      const key = keyPath.get()
      path.model.set(path.push(key), children.default())
    })
    const keyRendered = keys.hook(this, keyPath, keyPath.get() ?? '', mounter)
    const suffix = keyRendered[1] + `<button class="add" data-id="${onAdd}">${Octicon.plus_circle}</button>`
    let body = ''
    if (typeof value === 'object' && value !== undefined) {
      body = Object.keys(value)
        .map(key => {
          const removeId = mounter.onClick(el => path.model.set(path.push(key), undefined))
          const childPath = path.modelPush(key)
          const category = children.category(childPath)
          const [cPrefix, cSuffix, cBody] = children.hook(this, childPath, value[key], mounter)
          return `<div class="node-entry"><div class="node ${children.type(childPath)}-node" ${category ? `data-category="${htmlEncode(category)}"` : ''}>
            <div class="node-header">
              ${error(childPath, mounter)}
              ${help(childPath, mounter)}
              <button class="remove" data-id="${removeId}">${Octicon.trashcan}</button>
              ${cPrefix}
              <label>${htmlEncode(key)}</label>
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
    let suffix = node.hook(suffixInjector, path, mounter) || ''
    let body = ''
    if (typeof value === 'object' && value !== undefined && (!(node.optional() && value === undefined))) {
      const activeFields = getActiveFields(path)
      body = Object.keys(activeFields)
        .filter(k => activeFields[k].enabled(path))
        .map(k => {
          const field = activeFields[k]
          const childPath = getChildModelPath(path, k)
          const context = childPath.getContext().join('.')
          const fieldSettings = App.settings.fields.find(f => f?.path && context.endsWith(f.path))
          if ((field.hidden && field.hidden()) || fieldSettings?.hidden) return ''

          const category = field.category(childPath)
          const [cPrefix, cSuffix, cBody] = field.hook(this, childPath, value[k], mounter)
          return `<div class="node ${field.type(childPath)}-node" ${category ? `data-category="${htmlEncode(category)}"` : ''}>
            <div class="node-header">
              ${error(childPath, mounter)}
              ${help(childPath, mounter)}
              ${cPrefix}
              <label>${htmlEncode(fieldSettings?.name ?? pathLocale(childPath))}</label>
              ${cSuffix}
            </div>
            ${cBody ? `<div class="node-body">${cBody}</div>` : ''}
            </div>`
        })
        .join('')
    }
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
  // return path.getContext().slice(-5).join('.')
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

import { Hook, ModelPath, Path, StringHookParams, ValidationOption, EnumOption, INode, DataModel, MapNode, StringNode } from '@mcschema/core'
import { locale, pathLocale, segmentedLocale } from '../locales'
import { Mounter } from '../Mounter'
import { hexId } from '../utils'

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
    const onFalse = mounter.registerClick(el => {
      path.model.set(path, node.optional() && value === false ? undefined : false)
    })
    const onTrue = mounter.registerClick(el => {
      path.model.set(path, node.optional() && value === true ? undefined : true)
    })
    return ['', `<button${value === false ? ' class="selected"' : ' '} 
        data-id="${onFalse}">${htmlEncode(locale('false'))}</button>
      <button${value === true ? ' class="selected"' : ' '} 
        data-id="${onTrue}">${htmlEncode(locale('true'))}</button>`, '']
  },

  choice({ choices, config, switchNode }, path, value, mounter) {
    const choice = switchNode.activeCase(path) ?? choices[0]
    const pathWithContext = (config?.context) ?
      new ModelPath(path.getModel(), new Path(path.getArray(), [config.context])) : path
    const pathWithChoiceContext = config?.choiceContext ? new Path([], [config.choiceContext]) : config?.context ? new Path([], [config.context]) : path
    const inject = choices.map(c => {
      if (c.type === choice.type) {
        return `<button class="selected" disabled>
          ${htmlEncode(pathLocale(pathWithChoiceContext.push(c.type)))}
        </button>`
      }
      const buttonId = mounter.registerClick(el => {
        path.model.set(path, c.change ? c.change(value) : c.node.default())
      })
      return `<button data-id="${buttonId}">
        ${htmlEncode(pathLocale(pathWithChoiceContext.push(c.type)))}
      </button>`
    }).join('')

    const [prefix, suffix, body] = choice.node.hook(this, pathWithContext, value, mounter)
    return [prefix, inject + suffix, body]
  },

  list({ children }, path, value, mounter) {
    const onAdd = mounter.registerClick(el => {
      if (!Array.isArray(value)) value = []
      path.model.set(path, [children.default(), ...value])
    })
    const onAddBottom = mounter.registerClick(el => {
      if (!Array.isArray(value)) value = []
      path.model.set(path, [...value, children.default()])
    })
    const suffix = `<button class="add" data-id="${onAdd}"></button>`
      + mounter.nodeInjector(path, mounter)

    let body = ''
    if (Array.isArray(value)) {
      body = value.map((childValue, index) => {
        const removeId = mounter.registerClick(el => path.model.set(path.push(index), undefined))
        const childPath = path.push(index).contextPush('entry')
        const category = children.category(childPath)
        const [cPrefix, cSuffix, cBody] = children.hook(this, childPath, childValue, mounter)
        return `<div class="node-entry"><div class="node ${children.type(childPath)}-node" ${category ? `data-category="${htmlEncode(category)}"` : ''} ${error(childPath)} ${help(childPath)}>
          <div class="node-header">
            <button class="remove" data-id="${removeId}"></button>
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
            <button class="add" data-id="${onAddBottom}"></button>
          </div>
        </div>`
      }
    }
    return ['', suffix, body]
  },

  map({ keys, children }, path, value, mounter) {
    const keyPath = new ModelPath(keysModel, new Path([hashString(path.toString())]))
    const onAdd = mounter.registerClick(el => {
      const key = keyPath.get()
      path.model.set(path.push(key), children.default())
    })
    const keyRendered = keys.hook(this, keyPath, keyPath.get() ?? '', mounter)
    const suffix = keyRendered[1]
      + `<button class="add" data-id="${onAdd}"></button>`
      + mounter.nodeInjector(path, mounter)
    let body = ''
    if (typeof value === 'object' && value !== undefined) {
      body = Object.keys(value)
        .map(key => {
          const removeId = mounter.registerClick(el => path.model.set(path.push(key), undefined))
          const childPath = path.modelPush(key)
          const category = children.category(childPath)
          const [cPrefix, cSuffix, cBody] = children.hook(this, childPath, value[key], mounter)
          return `<div class="node-entry"><div class="node ${children.type(childPath)}-node" ${category ? `data-category="${htmlEncode(category)}"` : ''} ${error(childPath)} ${help(childPath)}>
            <div class="node-header">
              <button class="remove" data-id="${removeId}"></button>
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
    const onChange = mounter.registerChange(el => {
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
    return ['', `<input data-id="${onChange}" value="${value}">`, '']
  },

  object({ node, getActiveFields, getChildModelPath }, path, value, mounter) {
    let prefix = ''
    if (node.optional()) {
      if (value === undefined) {
        prefix = `<button class="collapse closed" data-id="${mounter.registerClick(() => path.model.set(path, node.default()))}"></button>`
      } else {
        prefix = `<button class="collapse open" data-id="${mounter.registerClick(() => path.model.set(path, undefined))}"></button>`
      }
    }
    let suffix = mounter.nodeInjector(path, mounter)
    let body = ''
    if (typeof value === 'object' && value !== undefined && (!(node.optional() && value === undefined))) {
      const activeFields = getActiveFields(path)
      body = Object.keys(activeFields)
        .filter(k => activeFields[k].enabled(path))
        .map(k => {
          const field = activeFields[k]
          const childPath = getChildModelPath(path, k)
          const category = field.category(childPath)
          const [cPrefix, cSuffix, cBody] = field.hook(this, childPath, value[k], mounter)
          return `<div class="node ${field.type(childPath)}-node" ${category ? `data-category="${htmlEncode(category)}"` : ''} ${error(childPath)} ${help(childPath)}>
            <div class="node-header">
              ${cPrefix}
              <label>${htmlEncode(pathLocale(childPath))}</label>
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
    return ['', rawString(params, path, inputId), '']
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

function error(p: ModelPath, exact = true) {
  const errors = p.model.errors.get(p, exact)
  if (errors.length === 0) return ''
  return `data-error="${htmlEncode(locale(errors[0].error, errors[0].params))}"`
}

function help(path: ModelPath) {
  const message = segmentedLocale(path.contextPush('help').getContext(), [], 6)
  if (message === undefined) return ''
  return `data-help="${htmlEncode(message)}"`
}

function htmlEncode(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;')
}

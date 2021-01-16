import { Hook } from '@mcschema/core'

type Args = any[]

export const walk = <U extends Args> (hook: Hook<[any, ...U], void>): Hook<[any, ...U], void> => ({
  ...hook,

  choice(params, path, value, ...args) {
    (hook.choice ?? hook.base)(params, path, value, ...args)
    params.switchNode.hook(this, path, value, ...args)
  },

  list(params, path, value, ...args) {
    (hook.list ?? hook.base)(params, path, value, ...args)
    if (!Array.isArray(value)) return
    value.forEach((e, i) =>
      params.children.hook(this, path.push(i), e, ...args)
    )
  },

  map(params, path, value, ...args) {
    (hook.map ?? hook.base)(params, path, value, ...args)
    if (typeof value !== 'object') return
    Object.keys(value).forEach(f =>
      params.children.hook(this, path.push(f), value[f], ...args)
    )
  },

  object(params, path, value, ...args) {
    (hook.object ?? hook.base)(params, path, value, ...args)
    if (value === null || typeof value !== 'object') return
    const activeFields = params.getActiveFields(path)
    Object.keys(activeFields)
      .filter(f => activeFields[f].enabled(path))
      .forEach(f => {
        activeFields[f].hook(this, path.push(f), value[f], ...args)
      })
  }
})

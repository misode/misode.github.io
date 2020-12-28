import { Errors, Hook, relativePath } from '@mcschema/core'
import { BlockStateRegistry } from '../App'
import { getFilterKey } from './getFilterKey'
import { walk } from './walk'

export const customValidation: Hook<[any, Errors], void> = walk<[Errors]>({
  base() {},

  boolean() {},

  choice() {},

  list() {},

  map({ config }, path, value) {
    if (config.validation?.validator === 'block_state_map') {
      const block = relativePath(path, config.validation.params.id).get()
      const errors = path.getModel().errors

      const requiredProps = (BlockStateRegistry[block] ?? {}).properties ?? {}
      const existingKeys = Object.keys(value ?? {})
      Object.keys(requiredProps).forEach(p => {
        if (!existingKeys.includes(p)) {
          if (path.last() === 'Properties') {
            errors.add(path, 'error.block_state.missing_property', p)
          }
        } else if (!requiredProps[p].includes(value[p])) {
          errors.add(path.push(p), 'error.invalid_enum_option', value[p])
        }
      })
    }
  },

  number() {},

  object({ node, getActiveFields }, path, value) {
    let activeFields = getActiveFields(path)
    const filterKey = path.modelArr.length === 0 ? null : node.hook(getFilterKey, path, path)
    const visibleKeys = Object.keys(activeFields)
      .filter(k => filterKey !== k)
      .filter(k => activeFields[k].enabled(path))
    if (visibleKeys.length === 1 && activeFields[visibleKeys[0]].type(path.push(visibleKeys[0])) === 'object') {
      if (activeFields[visibleKeys[0]].optional() && JSON.stringify(value[visibleKeys[0]]) === '{}') {
        path.push(visibleKeys[0]).set(undefined)
      }
    }
  },

  string() {}
})

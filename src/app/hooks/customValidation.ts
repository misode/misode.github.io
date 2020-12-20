import { Errors, Hook, relativePath } from '@mcschema/core'
import { BlockStateRegistry } from '../App'
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

  object() {},

  string() {}
})

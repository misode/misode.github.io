import { Hook } from '@mcschema/core'
import { getFilterKey } from './getFilterKey'

export const canFlatten: Hook<[], boolean> = {
  base: () => false,
  boolean: () => false,
  choice: () => false,
  list: () => false,
  map: () => false,
  number: () => false,
  string: () => false,
  object({ node, getActiveFields }, path) {
    const filterKey = path.modelArr.length === 0 ? null : node.hook(getFilterKey, path, path)
    const visibleEntries = Object.entries(getActiveFields(path))
      .filter(([k, v]) => filterKey !== k && v.enabled(path))
    if (visibleEntries.length !== 1) return false

    const nestedPath = path.push(visibleEntries[0][0])
    if (visibleEntries[0][1].type(nestedPath) !== 'object') return false

    return visibleEntries[0][1].hook(getFilterKey, nestedPath, nestedPath) === null
  }
}

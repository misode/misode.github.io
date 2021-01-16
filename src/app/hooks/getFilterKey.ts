import { Hook, ModelPath, relativePath } from '@mcschema/core'

export const getFilterKey: Hook<[ModelPath, number?], string | null> = {
  base: () => null,
  object({ filter, getActiveFields }, path, origin, depth = 0) {
    if (depth > 2) return null
    if (filter) {
      const filtered = relativePath(path, filter)
      if (filtered && filtered.pop().equals(origin)) return filtered.last() as string
    }
    const activeFields = getActiveFields(path)
    for (const k of Object.keys(activeFields)) {
      const filtered = activeFields[k].hook(this, path.push(k), origin, depth += 1)
      if (filtered) return filtered
    }
    return null
  }
}

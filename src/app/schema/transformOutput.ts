import type { Hook } from '@mcschema/core'

export const transformOutput: Hook<[any], any> = {
	base({}, _, value) {
		return value
	},

	choice({ switchNode }, path, value) {
		return switchNode.hook(this, path, value)
	},

	list({ children }, path, value) {
		if (!Array.isArray(value)) return value
		return value.map((obj, index) =>
			children.hook(this, path.push(index), obj)
		)
	},

	map({ children }, path, value) {
		if (value === undefined) return undefined
		const res: any = {}
		Object.keys(value).forEach(f =>
			res[f] = children.hook(this, path.push(f), value[f])
		)
		return res
	},

	object({ getActiveFields }, path, value) {
		if (value === undefined || value === null || typeof value !== 'object') {
			return value
		}
		const res: any = {}
		const activeFields = getActiveFields(path)
		Object.keys(activeFields)
			.filter(k => activeFields[k].enabled(path))
			.forEach(f => {
				res[f] = activeFields[f].hook(this, path.push(f), value[f])
			})
		return res
	},
}

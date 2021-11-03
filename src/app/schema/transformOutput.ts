import type { Hook } from '@mcschema/core'
import { relativePath } from '@mcschema/core'
import type { BlockStateRegistry } from '../services'

export type OutputProps = {
	blockStates: BlockStateRegistry,
}
export const transformOutput: Hook<[any, OutputProps], any> = {
	base({}, _, value) {
		return value
	},

	choice({ switchNode }, path, value, props) {
		return switchNode.hook(this, path, value, props)
	},

	list({ children }, path, value, props) {
		if (!Array.isArray(value)) return value
		return value.map((obj, index) =>
			children.hook(this, path.push(index), obj.node, props)
		)
	},

	map({ children, config }, path, value, props) {
		if (value === undefined) return undefined
		const blockState = config.validation?.validator === 'block_state_map'? props.blockStates?.[relativePath(path, config.validation.params.id).get()] : null
		const res: any = {}
		Object.keys(value).forEach(f => {
			if (blockState) {
				if (!Object.keys(blockState.properties ?? {}).includes(f)) return
			}
			res[f] = children.hook(this, path.push(f), value[f], props)
		})
		return res
	},

	object({ getActiveFields }, path, value, props) {
		if (value === undefined || value === null || typeof value !== 'object') {
			return value
		}
		const res: any = {}
		const activeFields = getActiveFields(path)
		Object.keys(activeFields)
			.filter(k => activeFields[k].enabled(path))
			.forEach(f => {
				res[f] = activeFields[f].hook(this, path.push(f), value[f], props)
			})
		return res
	},
}

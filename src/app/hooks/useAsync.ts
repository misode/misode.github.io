import type { Inputs } from 'preact/hooks'
import { useEffect } from 'preact/hooks'
import type { AsyncCancel, AsyncState } from './index.js'
import { useAsyncFn } from './index.js'

export function useAsync<R>(
	fn: () => Promise<R | typeof AsyncCancel>,
	inputs: Inputs = [],
	initialState: AsyncState<R> = { loading: true },
): AsyncState<R> & { refresh: () => Promise<unknown> } {
	const [state, callback] = useAsyncFn<R, () => Promise<R | typeof AsyncCancel>>(fn, inputs, initialState)

	useEffect(() => {
		callback()
	}, [callback])

	return {
		...state,
		refresh: callback,
	}
}

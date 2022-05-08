import type { Inputs } from 'preact/hooks'
import { useEffect } from 'preact/hooks'
import type { AsyncState } from './useAsyncFn'
import { useAsyncFn } from './useAsyncFn'

export function useAsync<T>(
	fn: () => Promise<T>,
	inputs: Inputs = [],
): AsyncState<T> {
	const [state, callback] = useAsyncFn<T, () => Promise<T>>(fn, inputs, { loading: true })

	useEffect(() => {
		callback()
	}, [callback])

	return state
}

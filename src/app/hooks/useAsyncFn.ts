import type { Inputs } from 'preact/hooks'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'


export type AsyncState<T> = {
	loading: boolean,
	error?: undefined,
	value?: undefined,
} | {
	loading: true,
	error?: Error | undefined,
	value?: T,
} | {
	loading: false,
	error: Error,
	value?: undefined,
} | {
	loading: false,
	error?: undefined,
	value: T,
}

export function useAsyncFn<R, T extends (...args: any[]) => Promise<R>>(
	fn: T,
	inputs: Inputs = [],
	initialState: AsyncState<R> = { loading: false },
): [AsyncState<R>, (...args: Parameters<T>) => Promise<R | undefined>] {
	const [state, setState] = useState<AsyncState<R>>(initialState)
	const isMounted = useRef<boolean>(false)
	const lastCallId = useRef(0)

	useEffect(() => {
		isMounted.current = true
		return () => isMounted.current = false
	}, [])

	const callback = useCallback((...args: Parameters<T>): Promise<R | undefined> => {
		const callId = ++lastCallId.current
		if (!state.loading) {
			setState(prev => ({ ...prev, loading: true }))
		}

		return fn(...args).then(
			value => {
				if (isMounted.current && callId === lastCallId.current) {
					setState({ value, loading: false })
				}
				return value
			},
			error => {
				if (isMounted.current && callId === lastCallId.current) {
					setState({ error, loading: false })
				}
				return undefined
			})
	}, inputs)

	return [state, callback]
}

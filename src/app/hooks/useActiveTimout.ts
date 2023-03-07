import { useCallback, useRef, useState } from 'preact/hooks'

interface ActiveTimeoutOptions {
	cooldown?: number,
	invert?: boolean,
	initial?: boolean,
}
export function useActiveTimeout({ cooldown, invert, initial }: ActiveTimeoutOptions = {}): [boolean | undefined, () => unknown] {
	const [active, setActive] = useState(initial)
	const timeout = useRef<number | undefined>(undefined)

	const trigger = useCallback(() => {
		setActive(invert ? false : true)
		if (timeout.current !== undefined) clearTimeout(timeout.current)
		timeout.current = setTimeout(() => {
			setActive(invert ? true : false)
		}, cooldown ?? 2000) as any
	}, [])

	return [active, trigger]
}

import { useEffect, useState } from 'preact/hooks'

export const LOSE_FOCUS = 'misode-lose-focus'

export function useFocus(): [boolean, (active?: boolean) => unknown] {
	const [active, setActive] = useState(false)

	const hider = () => {
		setActive(false)
	}

	useEffect(() => {
		if (active) {
			document.body.addEventListener('click', hider)
			document.body.addEventListener('contextmenu', hider)
			document.body.addEventListener(LOSE_FOCUS, hider)
		}
		return () => {
			document.body.removeEventListener('click', hider)
			document.body.removeEventListener('contextmenu', hider)
			document.body.removeEventListener(LOSE_FOCUS, hider)
		}
	}, [active])

	return [active, (active = true) => setActive(active)]
}

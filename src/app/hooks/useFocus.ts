import { useEffect, useState } from 'preact/hooks'

export function useFocus(): [boolean, (active?: boolean) => unknown] {
	const [active, setActive] = useState(false)

	const hider = () => {
		setActive(false)
	}

	useEffect(() => {
		if (active) {
			document.body.addEventListener('click', hider)
			document.body.addEventListener('contextmenu', hider)
		}
		return () => {
			document.body.removeEventListener('click', hider)
			document.body.removeEventListener('contextmenu', hider)
		}
	}, [active])

	return [active, (active = true) => setActive(active)]
}

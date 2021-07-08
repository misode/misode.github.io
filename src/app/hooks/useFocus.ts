import { useEffect, useState } from 'preact/hooks'

export function useFocus(): [boolean, () => unknown] {
	const [active, setActive] = useState(false)

	const hider = () => {
		setActive(false)
	}

	useEffect(() => {
		if (active) {
			document.body.addEventListener('click', hider)
		}
		return () => {
			document.body.removeEventListener('click', hider)
		}
	}, [active])

	return [active, () => setActive(true)]
}

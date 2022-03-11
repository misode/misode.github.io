import { useEffect, useState } from 'preact/hooks'

export function useMediaQuery(query: string): boolean {
	const [prefers, setPrefers] = useState(matchMedia(query).matches)

	const onChange = (e: MediaQueryListEvent) => {
		setPrefers(e.matches)
	}

	useEffect(() => {
		const mediaQuery = matchMedia(query)
		mediaQuery.addEventListener('change', onChange)
		return () => {
			mediaQuery.removeEventListener('change', onChange)
		}
	}, [query])

	return prefers
}

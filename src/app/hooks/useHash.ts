import { useCallback, useEffect, useState } from 'preact/hooks'
import { changeUrl } from '../Utils.js'

export function useHash(): [string, (hash: string) => unknown] {
	const [hash, setHash] = useState(window.location.hash)

	const onChange = useCallback(() => {
		setHash(window.location.hash)
	}, [])

	useEffect(() => {
		window.addEventListener('hashchange', onChange)
		window.addEventListener('replacestate', onChange)
		return () => {
			window.removeEventListener('hashchange', onChange)
			window.removeEventListener('replacestate', onChange)
		}
	}, [])

	const changeHash = useCallback((newHash: string) => {
		if (newHash !== hash) {
			changeUrl({ hash: newHash })
		}
	}, [hash])

	return [hash, changeHash]
}

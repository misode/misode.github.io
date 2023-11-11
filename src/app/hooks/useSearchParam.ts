import { useCallback, useEffect, useState } from 'preact/hooks'
import { changeUrl } from '../Utils.js'

const getValue = (search: string, param: string) => new URLSearchParams(search).get(param) ?? undefined

export function useSearchParam(param: string): [string | undefined, (value: string | undefined, replace?: boolean) => unknown] {
	const location = window.location
	const [value, setValue] = useState<string | undefined>(getValue(location.search, param))

	useEffect(() => {
		const onChange = () => {
			setValue(getValue(location.search, param))
		}

		window.addEventListener('popstate', onChange)
		window.addEventListener('pushstate', onChange)
		window.addEventListener('replacestate', onChange)

		return () => {
			window.removeEventListener('popstate', onChange)
			window.removeEventListener('pushstate', onChange)
			window.removeEventListener('replacestate', onChange)
		}
	}, [])

	const changeValue = useCallback((newValue: string | undefined, replace?: boolean) => {
		if (newValue !== value) {
			setValue(newValue)
			const params = new URLSearchParams(location.search)
			if (newValue === undefined || newValue.length === 0) {
				params.delete(param)
			} else {
				params.set(param, newValue)
			}
			changeUrl({ search: params.toString().replaceAll('%7C', '|').replaceAll('%2F', '/'), replace })
		}
	}, [value])

	return [value, changeValue]
};

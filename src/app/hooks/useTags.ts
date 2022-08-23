import { useMemo } from 'preact/hooks'
import { useSearchParam } from './index.js'

const TAG_KEY = 'tags'
const TAG_SEP = '|'

export function useTags(): [string[], (tag: string, force?: boolean) => void] {
	const [tags, setTags] = useSearchParam(TAG_KEY)
	const activeTags = useMemo(() => tags?.split(TAG_SEP) ?? [], [tags])

	const toggleTag = (tag: string, force?: boolean) => {
		if (force === false || (activeTags.includes(tag) && force !== true)) {
			setTags(activeTags.filter(t => t !== tag).join(TAG_SEP), true)
		} else {
			setTags([...activeTags, tag].sort().join(TAG_SEP), true)
		}
	}

	return [activeTags, toggleTag]
}

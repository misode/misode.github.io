import type { ComponentChildren } from 'preact'
import { useMemo, useState } from 'preact/hooks'
import { useLocale } from '../../contexts/index.js'
import { useSearchParam, useTags } from '../../hooks/index.js'
import type { Change } from '../../services/index.js'
import { Badge } from '../Badge.jsx'
import { Btn, TextInput } from '../index.js'
import { ChangelogEntry } from './ChangelogEntry.js'

const SEARCH_KEY = 'search'

interface Props {
	changes: Change[] | undefined,
	defaultOrder: 'asc' | 'desc',
	limit?: number,
	navigation?: ComponentChildren,
}
export function ChangelogList({ changes, defaultOrder, limit, navigation }: Props) {
	const { locale } = useLocale()

	const [search, setSearch] = useSearchParam(SEARCH_KEY)
	const [tags, toggleTag] = useTags()

	const filteredChangelogs = useMemo(() => {
		const query = (search ?? '').split(' ').map(q => q.trim().toLowerCase()).filter(q => q.length > 0)
		if (query.length === 0 && tags.length === 0) return changes
		return changes?.filter(change => {
			if (!tags.every(tag => change.tags.includes(tag))) {
				return false
			}
			const content = `${change.group} ${change.version} ${change.tags.join(' ')} ${change.content.toLowerCase()}`
			return query.every(q => {
				if (q.startsWith('!')) {
					return q.length === 1 || !content.includes(q.slice(1))
				}
				return content.includes(q)
			})
		})
	}, [changes, search, tags])

	const [sort, setSort] = useState(defaultOrder === 'desc')

	const sortedChangelogs = useMemo(() => {
		return filteredChangelogs?.sort((a, b) => sort ? b.order - a.order : a.order - b.order)
	}, [filteredChangelogs, sort])

	const [limitActive, setLimitActive] = useState(true)

	const limitedChangelogs = useMemo(() => {
		if (!limitActive || (limit ?? -1) < 0) return sortedChangelogs 
		return sortedChangelogs?.slice(0, limit)
	}, [sortedChangelogs, limitActive, limit, sort /* why is this necessary??? */])

	const hiddenChanges = (sortedChangelogs?.length ?? 0) - (limitedChangelogs?.length ?? 0)

	return <>
		<div class="navigation">
			{navigation}
			<TextInput class="btn btn-input query-search" list="sound-list" placeholder={locale('changelog.search')}
				value={search} onChange={v => setSearch(v, true)} />
			<Btn icon={sort ? 'sort_desc' : 'sort_asc'} label={sort ? 'Newest first' : 'Oldest first'} onClick={() => setSort(!sort)} />
		</div>
		{tags.length > 0 && <div class="badges-list">
			{tags.map(tag => <Badge label={tag} onClick={() => toggleTag(tag)} />)}
		</div>}
		<div class="result-list">
			{limitedChangelogs === undefined
				? <span class="note">{locale('loading')}</span>
				: limitedChangelogs.length === 0
					? <span class="note">{locale('changelog.no_results')}</span>
					:	limitedChangelogs.map(change =>
						<ChangelogEntry change={change} activeTags={tags} toggleTag={toggleTag} />)}
			{hiddenChanges > 0 && (
				<Btn label={locale('changelog.show_more', `${hiddenChanges}`)} onClick={() => setLimitActive(false)}/>
			)}
		</div>
	</>
}

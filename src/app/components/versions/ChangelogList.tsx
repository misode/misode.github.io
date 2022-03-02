import { useMemo, useState } from 'preact/hooks'
import { Btn, TextInput } from '..'
import { useLocale } from '../../contexts'
import type { Change } from '../../services'
import { ChangelogEntry } from './ChangelogEntry'
import { ChangelogTag } from './ChangelogTag'

interface Props {
	changes: Change[] | undefined,
	defaultOrder: 'asc' | 'desc',
}
export function ChangelogList({ changes, defaultOrder }: Props) {
	const { locale } = useLocale()
	
	const [search, setSearch] = useState('')
	const [tags, setTags] = useState<string[]>([])
	const toggleTag = (tag: string) => {
		if (!tags.includes(tag)) {
			setTags([...tags, tag])
		} else {
			setTags(tags.filter(t => t !== tag))
		}
	}

	const filteredChangelogs = useMemo(() => {
		const query = search.split(' ').map(q => q.trim().toLowerCase()).filter(q => q.length > 0)
		if (query.length === 0 && tags.length === 0) return changes
		return changes?.filter(change => {
			if (!tags.every(tag => change.tags.includes(tag))) {
				return false
			}
			const content = change.tags.join(' ') + ' ' + change.content.toLowerCase()
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

	return <>
		<div class="changelog-query">
			<TextInput class="btn btn-input changelog-search" list="sound-list" placeholder={locale('changelog.search')}
				value={search} onChange={setSearch} />
			<Btn icon={sort ? 'sort_desc' : 'sort_asc'} label={sort ? 'Newest first' : 'Oldest first'} onClick={() => setSort(!sort)} />
		</div>
		{tags.length > 0 && <div class="changelog-tags">
			{tags.map(tag => <ChangelogTag label={tag} onClick={() => setTags(tags.filter(t => t !== tag))} />)}
		</div>}
		<div class="changelog-list">
			{sortedChangelogs === undefined
				? <span>{locale('loading')}</span>
				: sortedChangelogs.length === 0
					? <span>{locale('changelog.no_results')}</span>
					:	sortedChangelogs.map(change =>
						<ChangelogEntry change={change} activeTags={tags} toggleTag={toggleTag} />)}
		</div>
	</>
}

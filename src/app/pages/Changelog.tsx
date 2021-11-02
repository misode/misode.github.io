import marked from 'marked'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { Ad, Btn, ErrorPanel, Octicon, TextInput } from '../components'
import { locale } from '../Locales'
import type { VersionId } from '../Schemas'
import type { ChangelogEntry, ChangelogVersion } from '../services/Changelogs'
import { getChangelogs } from '../services/Changelogs'
import { hashString } from '../Utils'

type ChangelogProps = {
	path?: string,
	lang: string,
	changeTitle: (title: string, versions?: VersionId[]) => unknown,
}
export function Changelog({ lang, changeTitle }: ChangelogProps) {
	const loc = locale.bind(null, lang)
	const [error, setError] = useState<string | null>(null)
	changeTitle(loc('title.changelog'))

	const [changelogs, setChangelogs] = useState<ChangelogEntry[]>([])
	useEffect(() => {
		getChangelogs()
			.then(changelogs => setChangelogs(changelogs))
			.catch(e => { console.error(e); setError(e) })
	}, [])

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
		if (query.length === 0 && tags.length === 0) return changelogs
		return changelogs.filter(change => {
			if (!tags.every(tag => change.tags.includes(tag))) {
				return false
			}
			const content = change.tags.join(' ') + ' ' + change.content.toLowerCase()
			return query.every(q => content.includes(q))
		})
	}, [changelogs, search, tags])

	const [sort, setSort] = useState(false)

	const sortedChangelogs = useMemo(() => {
		return filteredChangelogs.sort((a, b) => sort ? b.order - a.order : a.order - b.order)
	}, [filteredChangelogs, sort])

	return <main>
		<Ad type="text" id="changelog" />
		{error && <ErrorPanel error={error} onDismiss={() => setError(null)} />}
		<div class="changelog-controls">
			<div class="changelog-query">
				<TextInput class="btn btn-input changelog-search" list="sound-list" placeholder={loc('changelog.search')}
					value={search} onChange={setSearch} />
				<Btn icon={sort ? 'sort_desc' : 'sort_asc'} label={sort ? 'Newest first' : 'Oldest first'} onClick={() => setSort(!sort)} />
			</div>
			{tags.length > 0 && <div class="changelog-tags">
				{tags.map(tag => <Tag label={tag} onClick={() => setTags(tags.filter(t => t !== tag))} />)}
			</div>}
		</div>
		<div class="changelog">
			{sortedChangelogs.map(change =>
				<Change change={change} activeTags={tags} toggleTag={toggleTag} />)}
		</div>
	</main>
}

type ChangeProps = {
	change: ChangelogEntry,
	activeTags: string[],
	toggleTag: (tag: string) => unknown,
}
function Change({ change, activeTags, toggleTag }: ChangeProps) {
	return <div class="changelog-entry">
		<div class="changelog-version">
			<ArticleLink {...change.version}/>
			<ArticleLink {...change.group}/>
		</div>
		<div class="changelog-tags">
			{change.tags.map(tag => <Tag label={tag} onClick={() => toggleTag(tag)} active={activeTags.includes(tag)} />)}
		</div>
		<div class="changelog-content" dangerouslySetInnerHTML={{ __html: marked(change.content) }} />
	</div>
}

function ArticleLink({ id, article }: ChangelogVersion) {
	return article === null
		? <span>{id}</span>
		: <a href={`https://www.minecraft.net/en-us/article/${article}`} target="_blank">{id}</a>
}

type TagProps = {
	label: string,
	active?: boolean,
	onClick?: () => unknown,
}
function Tag({ label, active, onClick }: TagProps) {
	const color = label === 'breaking' ? 5 : hashString(label) % 360
	return <div class={`changelog-tag${active ? ' active' : ''}${onClick ? ' clickable' : ''}`} style={`--tint: ${color}`} onClick={onClick}>
		{label === 'breaking' && Octicon.alert}
		{label}
	</div>
}

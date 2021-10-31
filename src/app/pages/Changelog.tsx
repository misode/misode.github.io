import marked from 'marked'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { Ad, ErrorPanel, TextInput } from '../components'
import { locale } from '../Locales'
import type { VersionId } from '../Schemas'
import type { ChangelogEntry } from '../services/Changelogs'
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
	const addTag = (tag: string) => {
		if (!tags.includes(tag)) {
			setTags([...tags, tag])
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

	return <main>
		<Ad type="text" id="changelog" />
		{error && <ErrorPanel error={error} onDismiss={() => setError(null)} />}
		<div class="changelog-controls">
			<TextInput class="btn btn-input changelog-search" list="sound-list" placeholder={loc('changelog.search')}
				value={search} onChange={setSearch} />
			{tags.length > 0 && <div class="changelog-tags">
				{tags.map(tag => <Tag label={tag} onClick={() => setTags(tags.filter(t => t !== tag))} />)}
			</div>}
		</div>
		<div class="changelog">
			{filteredChangelogs.map(change =>
				<Change change={change} activeTags={tags} addTag={addTag} />)}
		</div>
	</main>
}

type ChangeProps = {
	change: ChangelogEntry,
	activeTags: string[],
	addTag: (tag: string) => unknown,
}
function Change({ change, activeTags, addTag }: ChangeProps) {
	return <div class="changelog-entry">
		<div class="changelog-tags">
			{change.tags.map(tag => <Tag label={tag} onClick={() => addTag(tag)} active={activeTags.includes(tag)} />)}
			<a class="changelog-version" href={`https://www.minecraft.net/en-us/article/minecraft-snapshot-${change.version}`}>{change.version}</a>
		</div>
		<div dangerouslySetInnerHTML={{ __html: marked(change.content) }} />
	</div>
}

type TagProps = {
	label: string,
	active?: boolean,
	onClick?: () => unknown,
}
function Tag({ label, active, onClick }: TagProps) {
	const color = hashString(label) % 360
	return <div class={`changelog-tag${active ? ' active' : ''}${onClick ? ' clickable' : ''}`} style={`--tint: ${color}`} onClick={onClick}>{label}</div>
}

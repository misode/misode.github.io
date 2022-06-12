import { useMemo, useState } from 'preact/hooks'
import { ChangelogTag, Footer, GuideCard, TextInput, VersionSwitcher } from '../components'
import { useLocale, useTitle, useVersion } from '../contexts'
import { useTags } from '../hooks/useTags'

interface Guide {
	id: string,
	title: string,
	versions?: string[],
	tags?: string[],
}

declare var __GUIDES__: Guide[]

interface Props {
	path?: string
}
export function Guides({}: Props) {
	const { locale } = useLocale()
	const { version, changeVersion } = useVersion()
	useTitle(locale('title.guides'))

	const [search, setSearch] = useState('')
	const [activeTags, toggleTag] = useTags()

	const [versionFilter, setVersionFiler] = useState(false)

	const versionedGuides = useMemo(() => {
		if (versionFilter === false) return __GUIDES__
		return __GUIDES__.filter(guide => {
			return guide.versions?.includes(version)
		})
	}, [version, versionFilter])

	const filteredGuides = useMemo(() => {
		const query = search.split(' ').map(q => q.trim().toLowerCase()).filter(q => q.length > 0)
		return versionedGuides.filter(guide => {
			if (!activeTags.every(tag => guide.tags?.includes(tag))) {
				return false
			}
			const content = guide.tags?.join(' ') + ' ' + guide.title.toLowerCase()
			return query.every(q => {
				if (q.startsWith('!')) {
					return q.length === 1 || !content.includes(q.slice(1))
				}
				return content.includes(q)
			})
		})
	}, [versionedGuides, search, activeTags])

	return <main>
		<div class="guides">
			<div class="changelog-query">
				<TextInput class="btn btn-input changelog-search" placeholder={locale('guides.search')} value={search} onChange={setSearch} />
				<VersionSwitcher value={versionFilter ? version : undefined} onChange={v => {changeVersion(v); setVersionFiler(true)}} hasAny onAny={() => setVersionFiler(false)} />
			</div>
			{activeTags.length > 0 && <div class="changelog-tags">
				{activeTags.map(tag => <ChangelogTag label={tag} onClick={() => toggleTag(tag)} />)}
			</div>}
			{versionedGuides.length === 0 ? <>
				<span class="note">{locale('guides.no_results.version')}</span>
			</> : filteredGuides.length === 0 ? <>
				<span class="note">{locale('guides.no_results.query')}</span>
			</> : filteredGuides.map(g =>
				<GuideCard title={g.title} link={`/guides/${g.id}/`} tags={g.tags ?? []} versions={g.versions ?? []} activeTags={activeTags} toggleTag={toggleTag} />
			)}
		</div>
		<Footer />
	</main>
}

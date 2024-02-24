import { Link } from 'preact-router'
import { useEffect, useMemo } from 'preact/hooks'
import { useLocale } from '../../contexts/index.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useSearchParam } from '../../hooks/useSearchParam.js'
import type { VersionMeta } from '../../services/index.js'
import { fetchChangelogs, getArticleLink } from '../../services/index.js'
import { Octicon } from '../Octicon.js'
import { ChangelogList, IssueList, VersionDiff, VersionMetaData } from './index.js'

const Tabs = ['changelog', 'diff', 'fixes']
const WIKI_PAGE_PREFIX = 'https://minecraft.wiki/w/Java_Edition_'

interface Props {
	id: string,
	version?: VersionMeta,
}
export function VersionDetail({ id, version }: Props) {
	const { locale } = useLocale()

	const [tab, setTab] = useSearchParam('tab')
	useEffect(() => {
		if (tab === undefined || !Tabs.includes(tab)) {
			setTab(Tabs[0], true)
		}
	}, [tab])

	const { value: changes } = useAsync(fetchChangelogs, [])

	const filteredChangelogs = useMemo(() =>
		changes?.filter(c => c.version === id || (c.group === id && !c.tags.includes('obsolete'))),
	[id, changes])

	const articleLink = version && getArticleLink(version.id)
	const wikiPageLink = version && WIKI_PAGE_PREFIX + version.name

	return <>
		<div class="version-detail">
			<h2>{version?.name ?? id}</h2>
			<div class="version-info">
				{version ? <>
					<VersionMetaData label={locale('versions.released')} value={releaseDate(version)} />
					{version.release_target !== null && <VersionMetaData label={locale('versions.release_target')} value={version.release_target} link={version.id !== version.release_target ? `/versions/?id=${version.release_target}` : undefined} />}
					<VersionMetaData label={locale('versions.data_version')} value={version.data_version} />
					<VersionMetaData label={locale('versions.protocol_version')} value={version.protocol_version} />
					<VersionMetaData label={locale('versions.data_pack_format')} value={version.data_pack_version} />
					<VersionMetaData label={locale('versions.resource_pack_format')} value={version.resource_pack_version} />
				</> : filteredChangelogs?.length ?? 0 > 1 ? <p>
					This version is not released yet.
				</p> : <p>
					This version does not exist. Only versions since 1.14 are tracked, or it may be too recent.
				</p>}
			</div>
			<div class="tabs">
				{Tabs.map(t => <Link key={t} class={tab === t ? 'selected' : ''} href={`/versions/?id=${id}&tab=${t}`}>
					{locale(`versions.${t}`)}
				</Link>)}
				{articleLink && <a href={articleLink} target="_blank">
					{locale('versions.article')}
					{Octicon.link_external}
				</a>}
				{wikiPageLink && <a href={wikiPageLink} target="_blank">
					{locale('versions.wiki')}
					{Octicon.link_external}
				</a>}
			</div>
			<div class="version-tab">
				{tab === 'changelog' && <ChangelogList changes={filteredChangelogs} defaultOrder="asc" />}
				{tab === 'diff' && <VersionDiff version={id} />}
				{tab === 'fixes' && <IssueList version={id} />}
			</div>
		</div>
	</>
}

export function releaseDate(version: VersionMeta) {
	return new Date(version.release_time).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

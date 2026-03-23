import { Link } from 'preact-router'
import { useEffect, useMemo } from 'preact/hooks'
import { useLocale } from '../../contexts/index.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useSearchParam } from '../../hooks/useSearchParam.js'
import type { VersionMeta } from '../../services/index.js'
import { fetchChangelogs } from '../../services/index.js'
import { Octicon } from '../Octicon.js'
import { ChangelogList, VersionDiff, VersionMetaData } from './index.js'

const Tabs = ['changelog', 'diff']
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

	const fixesLink = version && getFixesLink(version.id)
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
					<VersionMetaData label={locale('versions.data_pack_format')} value={new Date(version.release_time) > new Date(2025, 6, 28) ? `${version.data_pack_version}.${version.data_pack_version_minor}` : version.data_pack_version} />
					<VersionMetaData label={locale('versions.resource_pack_format')} value={new Date(version.release_time) > new Date(2025, 6, 28) ? `${version.resource_pack_version}.${version.resource_pack_version_minor}` : version.resource_pack_version} />
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
				<a href={fixesLink} target="_blank">
					{locale('versions.fixes')}
					{Octicon.link_external}
				</a>
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
			</div>
		</div>
	</>
}

export function releaseDate(version: VersionMeta) {
	return new Date(version.release_time).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

const FIXES_PREFIX = 'https://mojira.dev/?project=MC&resolution=Fixed&fix_version='

function getFixesLink(version: string) {
	let match
	if ((match = version.match(/^(\d+\.\d+(?:\.\d+)?)-snapshot-(\d+)$/)) && match[1] && match[2]) {
		return FIXES_PREFIX + encodeURIComponent(`${match[1]} Snapshot ${match[2]}`)
	}
	if ((match = version.match(/^(\d+\.\d+(?:\.\d+)?)-pre-?(\d+)$/)) && match[1] && match[2]) {
		return FIXES_PREFIX + encodeURIComponent(`${match[1]} Pre-Release ${match[2]}`)
	}
	if ((match = version.match(/^(\d+\.\d+(?:\.\d+)?)-rc-?(\d+)$/)) && match[1]) {
		return FIXES_PREFIX + encodeURIComponent(`${match[1]} Release Candidate ${match[2]}`)
	}
	return FIXES_PREFIX + encodeURIComponent(version)
}

const ARTICLE_PREFIX = 'https://www.minecraft.net/article/'
const ARTICLE_OVERRIDES = new Map(Object.entries({
	'1.16-pre2': 'minecraft-1-16-pre-release-1',
	'1.16-pre4': 'minecraft-1-16-pre-release-3',
	'1.16-pre5': 'minecraft-1-16-pre-release-3',
	'1.16-pre7': 'minecraft-1-16-pre-release-6',
	'1.16-pre8': 'minecraft-1-16-pre-release-6',
	'1.16-rc1': 'minecraft-1-16-release-candidate',
	'1.16': 'nether-update-java',
	'1.16.2-pre3': 'minecraft-1-16-2-pre-release-2',
	'1.16.2-rc1': 'minecraft-1-16-2-pre-release-2',
	'1.16.2-rc2': 'minecraft-1-16-2-pre-release-2',
	'1.17-pre3': 'minecraft-1-17-pre-release-2',
	'1.17-pre4': 'minecraft-1-17-pre-release-2',
	'1.17-pre5': 'minecraft-1-17-pre-release-2',
	'1.17.1-pre3': 'minecraft-1-17-1-pre-release-2',
	'1.17-rc2': 'minecraft-1-17-release-candidate-1',
	'1.17': 'caves---cliffs--part-i-out-today-java',
	'1.17.1-rc2': 'minecraft-1-17-1-release-candidate-1',
	'1.18-pre3': 'minecraft-1-18-pre-release-2',
	'1.18-pre4': 'minecraft-1-18-pre-release-2',
	'1.18-pre5': 'minecraft-1-18-pre-release-2',
	'1.18-pre7': 'minecraft-1-18-pre-release-6',
	'1.18-pre8': 'minecraft-1-18-pre-release-6',
	'1.18-rc2': 'minecraft-1-18-release-candidate-1',
	'1.18-rc3': 'minecraft-1-18-release-candidate-1',
	'1.18-rc4': 'minecraft-1-18-release-candidate-1',
	'1.18': 'caves---cliffs--part-ii-out-today-java',
	'1.18.1-rc2': 'minecraft-1-18-1-release-candidate-1',
	'1.18.1-rc3': 'minecraft-1-18-1-release-candidate-1',
	'1.18.2-pre3': 'minecraft-1-18-2-pre-release-2',
	'1.18.2-pre5': 'minecraft-1-18-2-pre-release-4',
	'1.19-pre3': 'minecraft-1-19-pre-release-2',
	'1.19-pre5': 'minecraft-1-19-pre-release-4',
	'1.19-rc2': 'minecraft-1-19-release-candidate-1',
	'1.19': 'the-wild-update-out-today-java',
	'1.19.1-pre4': 'minecraft-1-19-1-pre-release-3',
	'1.19.2-rc2': 'minecraft-1-19-2-release-candidate-1',
	'1.19.3-pre2': 'minecraft-1-19-3-pre-release-1',
	'1.19.3-rc2': 'minecraft-1-19-3-release-candidate-1',
	'1.19.4-pre3': 'minecraft-1-19-4-pre-release-2',
	'1.19.4-rc2': 'minecraft-1-19-4-release-candidate-1',
	'1.20-pre3': 'minecraft-1-20-pre-release-2',
	'1.20-pre4': 'minecraft-1-20-pre-release-2',
	'1.20-pre6': 'minecraft-1-20-pre-release-5',
	'1.20': 'trails-tales-update-out-today-java',
	'1.20.1': 'minecraft--java-edition-1-20-1',
	'1.20.2-pre2': 'minecraft-1-20-2-pre-release-1',
	'23w43b': 'minecraft-snapshot-23w43b',
	'24w03b': 'minecraft-snapshot-24w03b',
	'24w05b': 'minecraft-snapshot-24w05b',
}))

function getArticleLink(version: string): string | undefined {
	const override = ARTICLE_OVERRIDES.get(version)
	if (override) {
		return ARTICLE_PREFIX + override
	}
	let match
	if ((match = version.match(/^(\d\dw\d\d)[a-z]$/)) && match[1]) {
		return ARTICLE_PREFIX + 'minecraft-snapshot-' + match[1] + 'a'
	}
	if ((match = version.match(/^(\d+\.\d+(?:\.\d+)?)-snapshot-(\d+)$/)) && match[1] && match[2]) {
		return ARTICLE_PREFIX + 'minecraft-' + match[1].replaceAll('.', '-') + '-snapshot-' + match[2]
	}
	if ((match = version.match(/^(\d+\.\d+(?:\.\d+)?)-pre-?(\d+)$/)) && match[1] && match[2]) {
		return ARTICLE_PREFIX + 'minecraft-' + match[1].replaceAll('.', '-') + '-pre-release-' + match[2]
	}
	if ((match = version.match(/^(\d+\.\d+(?:\.\d+)?)-rc-?(\d+)$/)) && match[1]) {
		return ARTICLE_PREFIX + 'minecraft-' + match[1].replaceAll('.', '-') + '-release-candidate-' + match[2] 
	}
	if (version.match(/^\d+\.\d+(\.\d+)?$/)) {
		return ARTICLE_PREFIX + 'minecraft-java-edition-' + version.replaceAll('.', '-')
	}
	return undefined
}

import { Ad, ErrorPanel, Octicon, VersionDetail, VersionList } from '../components'
import { useLocale, useTitle } from '../contexts'
import { useAsync, useSearchParam } from '../hooks'
import type { VersionMeta } from '../services'
import { fetchVersions } from '../services'

interface Props {
	path?: string,
}
export function Versions({}: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.versions'))

	const { value: versions, error } = useAsync(fetchVersions, [])

	const [selectedId] = useSearchParam('id')
	const selected = (versions ?? []).find(v => v.id === selectedId)

	useTitle(selected ? selected.name : 'Versions Explorer', selected ? [] : undefined)

	const nextVersion = selected && getOffsetVersion(versions ?? [], selected, -1)
	const previousVersion = selected && getOffsetVersion(versions ?? [], selected, 1)

	return <main>
		<Ad type="text" id="versions" />
		{error && <ErrorPanel error={error} />}
		<div class="versions">
			{selectedId ? <>
				<div class="navigation">
					<a class="btn btn-link" href="/versions/">
						{Octicon.three_bars}
						{locale('versions.all')}
					</a>
					<a class="btn btn-link" {...previousVersion ? {href: `/versions/?id=${previousVersion.id}`} : {disabled: true}}>
						{Octicon.arrow_left}
						{locale('versions.previous')}
					</a>
					<a class="btn btn-link" {...nextVersion ? {href: `/versions/?id=${nextVersion.id}`} : {disabled: true}}>
						{locale('versions.next')}
						{Octicon.arrow_right}
					</a>
				</div>
				{selected ? <VersionDetail version={selected} />
					: <div class="version-detail">
						<h2>{selectedId}</h2>
						<div class="version-info">
							<p>This version does not exist. Only versions since 1.14 are tracked, or it may be too recent.</p>
						</div>
					</div>}
			</> : <VersionList versions={versions ?? []} link={id => `/versions/?id=${id}`} />}
		</div>
	</main>
}

function getOffsetVersion(versions: VersionMeta[], current: VersionMeta, offset: number) {
	const currentIndex = versions.findIndex(v => v.id === current.id)
	const offsetIndex = currentIndex + offset
	if (offsetIndex < 0 || offsetIndex >= versions.length) {
		return undefined
	}
	return versions[offsetIndex]
}

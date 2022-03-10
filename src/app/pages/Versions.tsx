import { getCurrentUrl } from 'preact-router'
import { useEffect, useState } from 'preact/hooks'
import { Ad, ErrorPanel, Octicon, VersionDetail, VersionList } from '../components'
import { useLocale, useTitle } from '../contexts'
import type { VersionMeta } from '../services'
import { fetchVersions } from '../services'
import { getSearchParams } from '../Utils'

interface Props {
	path?: string,
}
export function Versions({}: Props) {
	const { locale } = useLocale()
	const [error, setError] = useState<Error | null>(null)
	useTitle(locale('title.versions'))

	const [versions, setVersions] = useState<VersionMeta[]>([])
	useEffect(() => {
		fetchVersions()
			.then(versions => setVersions(versions))
			.catch(e => { console.error(e); setError(e) })
	}, [])

	const selectedId = getSearchParams(getCurrentUrl()).get('id')
	const selected = versions.find(v => v.id === selectedId)

	useTitle(selected ? selected.name : 'Versions Explorer', selected ? [] : undefined)

	const nextVersion = selected && getOffsetVersion(versions, selected, -1)
	const previousVersion = selected && getOffsetVersion(versions, selected, 1)

	return <main>
		<Ad type="text" id="versions" />
		{error && <ErrorPanel error={error} onDismiss={() => setError(null)} />}
		<div class="versions">
			{selected ? <>
				<div class="version-navigation">
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
				<VersionDetail version={selected} />
			</> : <VersionList versions={versions} link={id => `/versions/?id=${id}`} />}
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

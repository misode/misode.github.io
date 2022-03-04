import { getCurrentUrl } from 'preact-router'
import { useEffect, useState } from 'preact/hooks'
import { Ad, BtnLink, ErrorPanel, VersionDetail, VersionList } from '../components'
import { useLocale, useTitle } from '../contexts'
import type { VersionMeta } from '../services'
import { fetchVersions } from '../services'
import { getSearchParams } from '../Utils'

interface Props {
	path?: string,
}
export function Versions({}: Props) {
	const { locale } = useLocale()
	const [error, setError] = useState<string | null>(null)
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

	const prevVersion = selected && getOffsetVersion(versions, selected, 1)
	const nextVersion = selected && getOffsetVersion(versions, selected, -1)

	return <main>
		<Ad type="text" id="versions" />
		{error && <ErrorPanel error={error} onDismiss={() => setError(null)} />}
		<div class="versions">
			{selected ? <>
				<div class="version-navigation">
					<BtnLink link="/versions/" icon="three_bars" label={locale('versions.all')} />
					<BtnLink link={prevVersion ? `/versions/?id=${prevVersion.id}` : undefined} 
						icon="arrow_left" label={locale('versions.previous')} />
					<BtnLink link={nextVersion ? `/versions/?id=${nextVersion.id}` : undefined} 
						icon="arrow_right" label={locale('versions.next')} swapped />
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

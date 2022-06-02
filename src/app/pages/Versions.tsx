import { Ad, BtnLink, ErrorPanel, VersionDetail, VersionList } from '../components'
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

	useTitle(
		selected ? `Minecraft ${selected.name}` : 'Versions Explorer',
		selected ? [] : undefined,
		selected ? 'Changes and metadata' : undefined)

	const nextVersion = selected && getOffsetVersion(versions ?? [], selected, -1)
	const previousVersion = selected && getOffsetVersion(versions ?? [], selected, 1)

	return <main>
		<Ad type="text" id="versions" />
		{error && <ErrorPanel error={error} />}
		<div class="versions">
			{selectedId ? <>
				<div class="version-navigation">
					<BtnLink link="/versions/" icon="three_bars" label={locale('versions.all')} />
					<BtnLink link={previousVersion ? `/versions/?id=${previousVersion.id}` : undefined}
						icon="arrow_left" label={locale('versions.previous')} />
					<BtnLink link={nextVersion ? `/versions/?id=${nextVersion.id}` : undefined} 
						icon="arrow_right" label={locale('versions.next')} swapped />
				</div>
				<VersionDetail id={selectedId} version={selected} />
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
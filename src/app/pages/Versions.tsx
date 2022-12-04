import { BtnLink, ErrorPanel, Footer, VersionDetail, VersionList } from '../components/index.js'
import { useLocale, useTitle } from '../contexts/index.js'
import { useAsync, useSearchParam } from '../hooks/index.js'
import type { VersionMeta } from '../services/index.js'
import { fetchVersions } from '../services/index.js'

interface Props {
	path?: string,
}
export function Versions({}: Props) {
	const { locale } = useLocale()

	const { value: versions, error } = useAsync(fetchVersions, [])

	const [selectedId] = useSearchParam('id')
	const selected = (versions ?? []).find(v => v.id === selectedId)
	
	const [tab] = useSearchParam('tab')

	useTitle(
		selected ? `Minecraft ${selected.name}` : 'Versions Explorer',
		selected ? [] : undefined,
		selected ? 'Changes and metadata' : undefined)

	const nextVersion = selected && getOffsetVersion(versions ?? [], selected, -1)
	const previousVersion = selected && getOffsetVersion(versions ?? [], selected, 1)

	return <main>
		{error && <ErrorPanel error={error} />}
		<div class="container">
			{selectedId ? <>
				<div class="navigation">
					<BtnLink link="/versions/" icon="three_bars" label={locale('versions.all')} />
					<BtnLink link={previousVersion ? `/versions/?id=${previousVersion.id}${tab ? `&tab=${tab}` : ''}` : undefined}
						icon="arrow_left" label={locale('versions.previous')} />
					<BtnLink link={nextVersion ? `/versions/?id=${nextVersion.id}${tab ? `&tab=${tab}` : ''}` : undefined} 
						icon="arrow_right" label={locale('versions.next')} swapped />
				</div>
				<VersionDetail id={selectedId} version={selected} />
			</> : <>
				<VersionList versions={versions} link={id => `/versions/?id=${id}`} navigation={(
					<BtnLink link="/changelog" icon="git_commit" label={locale('versions.technical_changes')} />
				)} />
			</>}
		</div>
		<Footer donate={false} />
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

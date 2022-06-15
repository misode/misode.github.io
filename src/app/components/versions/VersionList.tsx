import { useMemo, useState } from 'preact/hooks'
import { useLocale } from '../../contexts/index.js'
import { useSearchParam } from '../../hooks/index.js'
import type { VersionMeta } from '../../services/index.js'
import { Checkbox, TextInput } from '../index.js'
import { VersionEntry } from './VersionEntry.js'

const SEARCH_KEY = 'search'

interface Props {
	versions: VersionMeta[]
	link?: (id: string) => string
}
export function VersionList({ versions, link }: Props) {
	const { locale } = useLocale()
	
	const [snapshots, setSnapshots] = useState(true)
	const [search, setSearch] = useSearchParam(SEARCH_KEY)

	const filteredVersions = useMemo(() => versions.filter(v => {
		if (v.type === 'snapshot' && !snapshots) return false
		return v.id.includes(search ?? '')
	}), [versions, snapshots, search])


	return <>
		<div class="versions-controls">
			<TextInput class="btn btn-input version-search" placeholder={locale('versions.search')}
				value={search} onChange={setSearch} />
			<Checkbox label="Include snapshots" value={snapshots} onChange={setSnapshots} />
		</div>
		<div class="version-list">
			{filteredVersions.map(v => <VersionEntry version={v} link={link?.(v.id)} />)}
			{filteredVersions.length === 0 && <span>
				{locale('versions.no_results')}
			</span>}
		</div>
	</>
}

import { useMemo, useState } from 'preact/hooks'
import { Checkbox, TextInput } from '..'
import { useLocale } from '../../contexts'
import type { VersionMeta } from '../../services'
import { VersionEntry } from './VersionEntry'

interface Props {
	versions: VersionMeta[]
	link?: (id: string) => string
}
export function VersionList({ versions, link }: Props) {
	const { locale } = useLocale()
	
	const [snapshots, setSnapshots] = useState(true)
	const [search, setSearch] = useState('')

	const filteredVersions = useMemo(() => versions.filter(v => {
		if (v.type === 'snapshot' && !snapshots) return false
		return v.id.includes(search)
	}), [versions, snapshots, search])


	return <>
		<div class="versions-controls">
			<TextInput class="btn btn-input version-search" list="sound-list" placeholder={locale('versions.search')}
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

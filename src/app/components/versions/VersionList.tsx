import type { ComponentChildren } from 'preact'
import { useMemo } from 'preact/hooks'
import { useLocale } from '../../contexts/index.js'
import { useLocalStorage, useSearchParam } from '../../hooks/index.js'
import type { VersionMeta } from '../../services/index.js'
import { Checkbox, TextInput } from '../index.js'
import { VersionEntry } from './VersionEntry.js'

const INCLUDE_SNAPSHOTS = 'misode_include_snapshots'
const SEARCH_KEY = 'search'

interface Props {
	versions?: VersionMeta[],
	link?: (id: string) => string,
	navigation?: ComponentChildren,
}
export function VersionList({ versions, link, navigation }: Props) {
	const { locale } = useLocale()
	
	const [snapshots, setSnapshots] = useLocalStorage(INCLUDE_SNAPSHOTS, true, v => v === 'true', b => `${b}`)
	const [search, setSearch] = useSearchParam(SEARCH_KEY)

	const filteredVersions = useMemo(() => versions?.filter(v => {
		if (v.type === 'snapshot' && !snapshots) return false
		return v.id.includes(search ?? '')
	}), [versions, snapshots, search])

	return <>
		<div class="navigation">
			{navigation}
			<TextInput class="btn btn-input query-search" placeholder={locale('versions.search')}
				value={search} onChange={setSearch} />
			<Checkbox label="Include snapshots" value={snapshots} onChange={setSnapshots} />
		</div>
		<div class="version-list">
			{filteredVersions === undefined
				? <span class="note">{locale('loading')}</span>
				: filteredVersions.length === 0
					? <span class="note">{locale('versions.no_results')}</span>
					:	filteredVersions.map(v => <VersionEntry version={v} link={link?.(v.id)} />)}
		</div>
	</>
}

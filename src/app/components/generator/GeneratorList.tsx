import { useMemo, useState } from 'preact/hooks'
import type { ConfigGenerator } from '../../Config.js'
import config from '../../Config.js'
import { useLocale, useVersion } from '../../contexts/index.js'
import { checkVersion } from '../../services/Schemas.js'
import { GeneratorCard, TextInput, VersionSwitcher } from '../index.js'

interface Props {
	path?: string,
	predicate?: (gen: ConfigGenerator) => boolean | undefined,
}
export function GeneratorList({ predicate }: Props) {
	const { locale } = useLocale()
	const { version, changeVersion } = useVersion()

	const [search, setSearch] = useState('')

	const [versionFilter, setVersionFiler] = useState(true)

	const versionedGenerators = useMemo(() => {
		return config.generators.filter(gen => {
			if (predicate === undefined || !predicate(gen)) return false
			if (versionFilter === false) return true
			return checkVersion(version, gen.minVersion, gen.maxVersion)
		})
	}, [version, versionFilter])

	const filteredGenerators = useMemo(() => {
		const query = search.split(' ').map(q => q.trim().toLowerCase()).filter(q => q.length > 0)
		return versionedGenerators.filter(gen => {
			const content = `${gen.id} ${gen.tags?.join(' ') ?? ''} ${gen.path ?? ''} ${gen.partner ?? ''} ${locale(gen.id).toLowerCase()}`
			return query.every(q => {
				if (q.startsWith('!')) {
					return q.length === 1 || !content.includes(q.slice(1))
				}
				return content.includes(q)
			})
		})
	}, [versionedGenerators, search, locale])

	return <div class="generator-list">
		<div class="navigation">
			<TextInput class="btn btn-input query-search" placeholder={locale('generators.search')} value={search} onChange={setSearch} autofocus />
			<VersionSwitcher value={versionFilter ? version : undefined} onChange={v => {changeVersion(v); setVersionFiler(true)}} hasAny onAny={() => setVersionFiler(false)} />
		</div>
		{filteredGenerators.length === 0 ? <>
			<span class="note">{locale('generators.no_results')}</span>
		</> : <div class="card-column">
			{filteredGenerators.map(gen =>
				<GeneratorCard id={gen.id} />
			)}
		</div>}
	</div>
}

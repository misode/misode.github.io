import type { ComponentChildren } from 'preact'
import { useMemo, useState } from 'preact/hooks'
import type { ConfigGenerator } from '../../Config.js'
import config from '../../Config.js'
import { useLocale, useVersion } from '../../contexts/index.js'
import { useSearchParam } from '../../hooks/useSearchParam.js'
import { checkVersion } from '../../services/Versions.js'
import { GeneratorCard, TextInput, VersionSwitcher } from '../index.js'

const SEARCH_KEY = 'search'

interface Props {
	path?: string,
	limit?: number,
	predicate?: (gen: ConfigGenerator) => boolean | undefined,
	compare?: (first: ConfigGenerator, second: ConfigGenerator) => number,
	extra?: ComponentChildren,
}
export function GeneratorList({ limit, predicate, compare, extra }: Props) {
	const { locale } = useLocale()
	const { version, changeVersion } = useVersion()

	const [search, setSearch] = useSearchParam(SEARCH_KEY)

	const [versionFilter, setVersionFiler] = useState(true)

	const versionedGenerators = useMemo(() => {
		return config.generators.filter(gen => {
			if (predicate === undefined || !predicate(gen)) return false
			if (versionFilter === false) return true
			return checkVersion(version, gen.minVersion, gen.maxVersion)
		})
	}, [version, versionFilter])

	const filteredGenerators = useMemo(() => {
		const results = versionedGenerators
			.map(g => ({ ...g, name: locale(`generator.${g.id}`).toLowerCase() }))
		return searchGenerators(results, search, compare)
	}, [versionedGenerators, search, locale])

	const limitedGenerators = useMemo(() => {
		if (limit === undefined) return filteredGenerators
		return filteredGenerators.slice(0, limit)
	}, [filteredGenerators, limit])

	return <div>
		<div class="navigation">
			<TextInput class="btn btn-input query-search" placeholder={locale('generators.search')} value={search} onChange={setSearch} autofocus />
			{extra}
			<VersionSwitcher value={versionFilter ? version : undefined} onChange={v => {changeVersion(v); setVersionFiler(true)}} hasAny onAny={() => setVersionFiler(false)} />
		</div>
		{limitedGenerators.length === 0 ? <>
			<span class="block note mt-2">{locale('generators.no_results')}</span>
		</> : <div class="card-grid">
			{limitedGenerators.map(gen =>
				<GeneratorCard id={gen.id} />
			)}
		</div>}
	</div>
}

const popularGeneratorsReversed = [
	'loot_table',
	'recipe',
	'advancement',
	'predicate',
	'worldgen/biome',
	'worldgen/density_function',
	'dimension',
	'worldgen/noise_settings',
].reverse()

export function searchGenerators(generators: (ConfigGenerator & { name: string})[], search?: string, compare?: (first: ConfigGenerator, second: ConfigGenerator) => number) {
	if (search) {
		const parts = search.split(' ').map(q => q.trim().toLowerCase()).filter(q => q.length > 0)
		generators = generators.filter(g => parts.some(p => g.name.includes(p))
			|| parts.some(p => g.path?.includes(p) ?? false)
			|| parts.some(p => g.tags?.some(t => t.includes(p)) ?? false)
			|| parts.some(p => g.aliases?.some(a => a.includes(p)) ?? false))
	}
	generators.sort((a, b) => {
		const compared = compare ? compare(a, b) : 0
		return compared == 0 ? a.name.localeCompare(b.name) : compared
	})
	if (search) {
		generators.sort((a, b) => (b.name.startsWith(search) ? 1 : 0) - (a.name.startsWith(search) ? 1 : 0))
	} else if (!compare) {
		generators.sort((a, b) => popularGeneratorsReversed.indexOf(b.id) - popularGeneratorsReversed.indexOf(a.id))
	}
	return generators
}

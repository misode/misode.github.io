import { useMemo } from 'preact/hooks'
import config from '../../Config.js'
import { useLocale } from '../../contexts/Locale.jsx'
import type { VersionId } from '../../services/Schemas.js'
import { checkVersion } from '../../services/Schemas.js'
import { cleanUrl } from '../../Utils.js'
import { ChangelogTag, Icons, ToolCard } from '../index.js'

interface Props {
	id: string,
	minimal?: boolean,
}
export function GeneratorCard({ id, minimal }: Props) {
	const { locale } = useLocale()

	const gen = useMemo(() => {
		const gen = config.generators.find(g => g.id === id)
		if (!gen) throw new Error(`Cannot find generator ${id}`)
		return gen
	}, [id])

	const title = locale(gen.partner ? `partner.${gen.partner}.${gen.id}` : gen.id)

	const icon = Object.keys(Icons).includes(id) ? id as keyof typeof Icons : undefined

	if (minimal) {
		return <ToolCard title={title} link={cleanUrl(gen.url)} titleIcon={icon} />
	}

	const versions = useMemo(() => {
		if (!gen) return []
		return config.versions
			.filter(v => checkVersion(v.id, gen.minVersion, gen.maxVersion))
			.map(v => v.id as VersionId)
	}, [gen])

	const tags = useMemo(() => {
		if (gen.category === 'assets') return ['resource-pack']
		return []
	}, [gen])

	console.log(icon)

	return <a class="guide-card" href={cleanUrl(gen.url)} >
		<span class="guide-versions">
			{gen.partner ? locale(`partner.${gen.partner}`) : versions.join(' • ')}
		</span>
		<h3>{title}{icon && Icons[icon]}</h3>
		{!gen.noPath && <p>/{gen.path ?? gen.id}</p>}
		{tags.length > 0 && <div class="guide-tags">
			{tags.sort().map(tag => <ChangelogTag label={tag} />)}
		</div>}
	</a>
}

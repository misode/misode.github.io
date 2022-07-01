import { useMemo } from 'preact/hooks'
import config from '../../Config.js'
import { useLocale } from '../../contexts/Locale.jsx'
import type { VersionId } from '../../services/Schemas.js'
import { checkVersion } from '../../services/Schemas.js'
import { cleanUrl } from '../../Utils.js'
import { Badge, Card, Icons, ToolCard } from '../index.js'

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
		if (gen.tags?.includes('assets')) return ['resource-pack']
		return []
	}, [gen])

	return <Card title={<>{title}{icon && Icons[icon]}</>} overlay={gen.partner ? locale(`partner.${gen.partner}`) : versions.join(' • ')} link={cleanUrl(gen.url)}>
		{!gen.noPath && <p class="card-subtitle">/{gen.path ?? gen.id}</p>}
		{tags.length > 0 && <div class="badges-list">
			{tags.sort().map(tag => <Badge label={tag} />)}
		</div>}
	</Card>
}

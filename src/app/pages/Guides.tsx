import { ToolCard } from '../components'
import { useLocale, useTitle } from '../contexts'

interface Guide {
	id: string,
	title: string,
	versions: string,
}

declare var __GUIDES__: Guide[]

interface Props {
	path?: string
}
export function Guides({}: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.guides'))

	return <main>
		<div class="guides">
			{__GUIDES__.map(g => <ToolCard title={g.title} link={`/guides/${g.id}/`} />)}
		</div>
	</main>
}

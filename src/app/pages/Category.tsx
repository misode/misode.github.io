import config from '../../config.json'
import { ToolCard } from '../components'
import { useLocale, useTitle } from '../contexts'
import { cleanUrl } from '../Utils'

interface Props {
	category: string,
	path?: string,
}
export function Category({ category }: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.generator_category', locale(category)))
	return <main>
		<div class="category">
			{config.generators.filter(g => g.category === category).map(g => 
				<ToolCard title={locale(g.id)} link={cleanUrl(g.url)} />
			)}
		</div>
	</main>
}

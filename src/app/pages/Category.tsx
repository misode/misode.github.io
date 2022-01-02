import config from '../../config.json'
import { ToolCard } from '../components'
import { useLocale } from '../contexts'
import { cleanUrl } from '../Utils'

type WorldgenProps = {
	category: string,
	changeTitle: (title: string) => unknown,
	path?: string,
}
export function Category({ category, changeTitle }: WorldgenProps) {
	const { locale } = useLocale()
	changeTitle(locale('title.generator_category', locale(category)))
	return <main>
		<div class="category">
			{config.generators.filter(g => g.category === category).map(g => 
				<ToolCard title={locale(g.id)} link={cleanUrl(g.url)} />
			)}
		</div>
	</main>
}

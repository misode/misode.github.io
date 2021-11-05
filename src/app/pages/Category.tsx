import config from '../../config.json'
import { ToolCard } from '../components'
import { locale } from '../Locales'
import { cleanUrl } from '../Utils'

type WorldgenProps = {
	category: string,
	lang: string,
	changeTitle: (title: string) => unknown,
	path?: string,
}
export function Category({ category, lang, changeTitle }: WorldgenProps) {
	const loc = locale.bind(null, lang)
	changeTitle(loc('title.generator_category', loc(category)))
	return <main>
		<div class="home">
			{config.generators.filter(g => g.category === category).map(g => 
				<ToolCard title={loc(g.id)} link={cleanUrl(g.url)} />
			)}
		</div>
	</main>
}

import config from '../../config.json'
import { ToolCard } from '../components'
import { locale } from '../Locales'
import { cleanUrl } from '../Utils'

type WorldgenProps = {
	lang: string,
	changeTitle: (title: string) => unknown,
	path?: string,
}
export function Worldgen({ lang, changeTitle }: WorldgenProps) {
	const loc = locale.bind(null, lang)
	changeTitle(loc('title.generator_category', loc('worldgen')))
	return <main>
		<div class="home">
			{config.models.filter(m => m.category === 'worldgen').map(m => 
				<ToolCard title={loc(m.id)} link={cleanUrl(m.id)} />
			)}
		</div>
	</main>
}

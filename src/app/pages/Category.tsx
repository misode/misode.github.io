import { Footer, ToolCard } from '../components/index.js'
import config from '../Config.js'
import { useLocale, useTitle } from '../contexts/index.js'
import { cleanUrl } from '../Utils.js'

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
		<Footer donate={false} />
	</main>
}

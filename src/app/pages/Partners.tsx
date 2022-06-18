import { Footer, ToolCard } from '../components/index.js'
import config from '../Config.js'
import { useLocale, useTitle } from '../contexts/index.js'
import { cleanUrl } from '../Utils.js'

const partners = [...new Set(config.generators
	.filter(g => g.partner !== undefined)
	.map(g => g.partner as string)
)]

interface Props {
	path?: string,
}
export function Partners({}: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.partners'))

	return <main>
		<div class="container">
			{partners.map(p => <ToolCard title={locale(`partner.${p}`)}>
				{config.generators.filter(g => g.partner === p).map(g =>
					<ToolCard title={locale(`partner.${p}.${g.id}`)} link={cleanUrl(g.url)} />
				)}
			</ToolCard>)}
		</div>
		<Footer donate={false} />
	</main>
}

import config from '../../config.json'
import { ToolCard } from '../components'
import { locale } from '../Locales'
import { cleanUrl } from '../Utils'

type HomeProps = {
	lang: string,
	changeTitle: (title: string) => unknown,
	path?: string,
}
export function Home({ lang, changeTitle }: HomeProps) {
	const loc = locale.bind(null, lang)
	changeTitle(loc('title.home'))
	return <main>
		<div class="home">
			<ToolCard title="Data packs">
				{config.generators.filter(g => !g.category).map(g => 
					<ToolCard title={loc(g.id)} link={cleanUrl(g.url)} />
				)}
				<ToolCard title={loc('worldgen')} link="/worldgen/" />
			</ToolCard>
			<ToolCard title="Resource packs">
				{config.generators.filter(g => g.category === 'assets').map(g =>
					<ToolCard title={loc(g.id)} link={cleanUrl(g.url)} />
				)}
			</ToolCard>
			<ToolCard title="Report Inspector" icon="report"
				link="https://misode.github.io/report/"
				desc="Analyse your performance reports" />
			<ToolCard title="Minecraft Sounds" icon="sounds"
				link="/sounds/"
				desc="Browse through and mix all the vanilla sounds" />
			<ToolCard title="Data Pack Upgrader"
				link="https://misode.github.io/upgrader/"
				desc="Convert your data packs from 1.16 to 1.17 to 1.18" />
			<ToolCard title="Technical Changelog" link="/changelog/" />
		</div>
	</main>
}

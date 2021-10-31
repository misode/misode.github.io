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
			{config.generators.filter(g => !g.category).map(g => 
				<ToolCard title={loc(g.id)} link={cleanUrl(g.url)} />
			)}
			<ToolCard title={loc('worldgen')} link="/worldgen/" />
			<hr />
			<ToolCard title="Report Inspector" icon="report" link="https://misode.github.io/report/">
				<p>Analyse your performance reports</p>
			</ToolCard>
			<ToolCard title="Minecraft Sounds" icon="sounds" link="/sounds/">
				<p>Browse through and mix all the vanilla sounds</p>
			</ToolCard>
			<ToolCard title="Data Pack Upgrader" link="https://misode.github.io/upgrader/">
				<p>Convert your 1.16 data packs to 1.17</p>
			</ToolCard>
			<ToolCard title="Technical Changelog" link="/changelog/" />
		</div>
	</main>
}

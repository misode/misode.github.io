import { useMemo } from 'preact/hooks'
import { Footer, GeneratorCard, Giscus, GuideCard, ToolCard, ToolGroup } from '../components/index.js'
import { useLocale, useTitle } from '../contexts/index.js'
import { Store } from '../Store.js'

const MIN_FAVORITES = 2
const MAX_FAVORITES = 5

interface Props {
	path?: string,
}
export function Home({}: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.home'))

	const favorites = useMemo(() => {
		const history: string[] = []
		for (const id of Store.getGeneratorHistory().reverse()) {
			if (!history.includes(id)) {
				history.push(id)
			}
		}
		return history.slice(0, MAX_FAVORITES)
	}, [])

	return <main>
		<div class="container">
			<div class="card-group">
				<ToolGroup title={locale('popular_generators')} link="/generators/">
					<GeneratorCard minimal id="loot_table" />
					<GeneratorCard minimal id="advancement" />
					<GeneratorCard minimal id="predicate" />
					<ToolCard title="Worldgen" link="/worldgen/" titleIcon="worldgen" />
					<ToolCard title="All Generators" link="/generators/" titleIcon="arrow_right" />
				</ToolGroup>
				{favorites.length >= MIN_FAVORITES && <ToolGroup title="Recently Used Generators">
					{favorites.map(f => <GeneratorCard minimal id={f} />)}
				</ToolGroup>}
				<ToolGroup title={locale('guides')} link="/guides/" titleIcon="arrow_right">
					<GuideCard id="adding-custom-structures" />
					<GuideCard id="noise-router" />
				</ToolGroup>
				<ToolGroup title={locale('tools')}>
					<ToolCard title="Report Inspector" icon="report"
						link="https://misode.github.io/report/"
						desc="Analyse your performance reports" />
					<ToolCard title="Minecraft Sounds" icon="sounds"
						link="/sounds/"
						desc="Browse through and mix all the vanilla sounds" />
					<ToolCard title="Data Pack Upgrader"
						link="https://misode.github.io/upgrader/"
						desc="Convert your data packs from 1.16 to 1.19" />
				</ToolGroup>

				<ToolCard title="Technical Changelog" link="/changelog/" />
				<ToolCard title="Minecraft Versions" link="/versions/" />
			</div>
			<Giscus />
			<Footer />
		</div>
	</main>
}

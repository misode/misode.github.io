import { useMemo } from 'preact/hooks'
import { Footer, GeneratorCard, Giscus, ToolCard } from '../components/index.js'
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
		<div class="container home">
			<ToolCard title="Popular Generators">
				<GeneratorCard minimal id="loot_table" />
				<GeneratorCard minimal id="advancement" />
				<GeneratorCard minimal id="predicate" />
				<GeneratorCard minimal id="dimension" />
				<ToolCard title="Worldgen" link="/worldgen/" titleIcon="arrow_right" />
				<ToolCard title="More" link="/generators/" titleIcon="arrow_right" />
			</ToolCard>
			{favorites.length >= MIN_FAVORITES && <ToolCard title="Recently Used Generators">
				{favorites.map(f => <GeneratorCard minimal id={f} />)}
			</ToolCard>}
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
			<ToolCard title="Minecraft Versions" link="/versions/" />
			<ToolCard title="Data Pack Guides" link="/guides/" />
			<Giscus />
			<Footer />
		</div>
	</main>
}

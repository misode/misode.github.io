import { Footer, GeneratorCard, GeneratorList, ToolGroup } from '../components/index.js'
import { useLocale, useTitle } from '../contexts/index.js'

interface Props {
	path?: string
}
export function Worldgen({}: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.worldgen'))

	return <main>
		<div class="legacy-container worldgen">
			<div class="card-group">
				<ToolGroup title={locale('generators.popular')}>
					<GeneratorCard minimal id="dimension" />
					<GeneratorCard minimal id="worldgen/biome" />
					<GeneratorCard minimal id="worldgen/noise_settings" />
					<GeneratorCard minimal id="worldgen/configured_feature" />
					<GeneratorCard minimal id="worldgen/placed_feature" />
				</ToolGroup>
				<ToolGroup title={locale('guides')} link="/guides/" titleIcon="arrow_right">
					<a class="tool-card minecraft-wiki" href="/guides/">
						<img src="https://minecraft.wiki/images/Wiki@2x.png" alt="Minecraft Wiki Logo" />
						<div>
							The guides have moved to the <em>Minecraft Wiki</em>!
						</div>
					</a>
				</ToolGroup>
			</div>
			<GeneratorList predicate={gen => gen.tags?.includes('worldgen')} />
		</div>
		<Footer />
	</main>
}

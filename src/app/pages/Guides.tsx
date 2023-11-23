import { Footer, Octicon } from '../components/index.js'
import config from '../Config.js'
import { useLocale } from '../contexts/Locale.jsx'
import { useTitle } from '../contexts/Title.jsx'

interface Props {
	path?: string
}
export function Guides({}: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.guides'))

	const guides = config.legacyGuides
	return <main>
		<div class="legacy-container guides">
			<div class="tool-card minecraft-wiki">
				<img src="https://minecraft.wiki/images/Wiki@2x.png" alt="Minecraft Wiki Logo" />
				<div>
					The guides have moved to the <em>Minecraft Wiki</em>!
				</div>
			</div>
			<div class="card-column pt-4">
				{guides.map(g => <a class="tool-card" href={`https://minecraft.wiki/w/${g?.link}`} target="_blank">
					<div>
						<h3>{g.title} {Octicon.link_external}</h3>
					</div>
				</a>)}
			</div>
		</div>
		<Footer />
	</main>
}

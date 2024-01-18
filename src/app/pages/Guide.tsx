import config from '../Config.js'
import { Footer } from '../components/Footer.jsx'
import { Octicon } from '../components/Octicon.jsx'
import { useTitle } from '../contexts/Title.jsx'

interface Props {
	path?: string
	id?: string
}
export function Guide({ id }: Props) {
	const guide = config.legacyGuides.find(g => g.id === id)
	useTitle(guide?.title)

	return <main>
		<div class="legacy-container">
			<a class="tool-card minecraft-wiki" href={`https://minecraft.wiki/w/${guide?.link}`} target="_blank">
				<img src="https://minecraft.wiki/images/Wiki@2x.png" alt="Minecraft Wiki Logo" />
				<div>
					<h3><span>This guide has moved to the <em>Minecraft Wiki</em></span> {Octicon.link_external}</h3>
				</div>
			</a>
		</div>
		<Footer />
	</main>
}

import type { RouterOnChangeArgs } from 'preact-router'
import { Router } from 'preact-router'
import '../styles/global.css'
import '../styles/nodes.css'
import { Analytics } from './Analytics.js'
import { Header } from './components/index.js'
import { Category, Changelog, Generator, Guide, Guides, Home, Partners, Sounds, Versions } from './pages/index.js'
import { cleanUrl } from './Utils.js'

export function App() {
	const changeRoute = (e: RouterOnChangeArgs) => {
		window.dispatchEvent(new CustomEvent('replacestate'))
		// Needs a timeout to ensure the title is set correctly
		setTimeout(() => Analytics.pageview(cleanUrl(e.url)))
	}

	return <>
		<Header />
		<Router onChange={changeRoute}>
			<Home path="/" />
			<Category path="/worldgen" category="worldgen" />
			<Category path="/tags" category="tags" />
			<Category path="/assets" category="assets" />
			<Partners path="/partners" />
			<Sounds path="/sounds" />
			<Changelog path="/changelog" />
			<Versions path="/versions" />
			<Guides path="/guides/" />
			<Guide path="/guides/:id" />
			<Generator default />
		</Router>
	</>
}

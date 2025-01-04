import { Router } from 'preact-router'
import '../styles/global.css'
import '../styles/nodes.css'
import { Header } from './components/index.js'
import { Changelog, Convert, Customized, Generator, Generators, Guide, Guides, Home, LegacyPartners, Partners, Sounds, Transformation, Versions, WhatsNew, Worldgen } from './pages/index.js'

export function App() {
	return <>
		<Header />
		<Router>
			<Home path="/" />
			<Generators path="/generators" />
			<Worldgen path="/worldgen" />
			<Partners path="/partners" />
			<LegacyPartners path="/partners/:id" />
			<Sounds path="/sounds" />
			<Changelog path="/changelog" />
			<Versions path="/versions" />
			<Transformation path="/transformation" />
			<Customized path="/customized" />
			<Convert path="/convert" />
			<Convert path="/convert/:formats" />
			<WhatsNew path="/whats-new" />
			<Guides path="/guides" />
			<Guide path="/guides/:id" />
			<Generator default />
		</Router>
	</>
}

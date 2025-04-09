import type { RouterOnChangeArgs } from 'preact-router'
import { Router } from 'preact-router'
import '../styles/global.css'
import '../styles/nodes.css'
import { Analytics } from './Analytics.js'
import { Header } from './components/index.js'
import {
	Customized,
	Generator,
	Generators,
	Guide,
	Guides,
	Home,
	LegacyPartners,
	Partners,
	Sounds,
	Transformation,
	Worldgen,
} from './pages/index.js'
import { cleanUrl } from './Utils.js'

export function App() {
	const changeRoute = (e: RouterOnChangeArgs) => {
		window.dispatchEvent(new CustomEvent('replacestate'))
		// Needs a timeout to ensure the title is set correctly
		setTimeout(() => Analytics.pageview(cleanUrl(e.url)))
	}

	return (
		<>
			<Header />
			<Router onChange={changeRoute}>
				<Home path='/' />
				<Generators path='/generators' />
				<Worldgen path='/worldgen' />
				<Partners path='/partners' />
				<LegacyPartners path='/partners/:id' />
				<Sounds path='/sounds' />
				<Transformation path='/transformation' />
				<Customized path='/customized' />
				<Guides path='/guides' />
				<Guide path='/guides/:id' />
				<Generator default />
			</Router>
		</>
	)
}

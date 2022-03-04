import type { RouterOnChangeArgs } from 'preact-router'
import { Router } from 'preact-router'
import '../styles/global.css'
import '../styles/nodes.css'
import { Analytics } from './Analytics'
import { Header } from './components'
import { Category, Changelog, Generator, Home, NewProject, Project, Sounds, Versions } from './pages'
import { cleanUrl } from './Utils'

export function App() {
	const changeRoute = (e: RouterOnChangeArgs) => {
		// Needs a timeout to ensure the title is set correctly
		setTimeout(() => Analytics.pageview(cleanUrl(e.url)))
	}

	return <>
		<Header />
		<Router onChange={changeRoute}>
			<Home path="/" />
			<Category path="/worldgen" category="worldgen" />
			<Category path="/assets" category="assets" />
			<Sounds path="/sounds" />
			<Changelog path="/changelog" />
			<Versions path="/versions" />
			<Project path="/project" />
			<NewProject path="/project/new" />
			<Generator default />
		</Router>
	</>
}

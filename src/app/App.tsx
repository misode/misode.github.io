import type { RouterOnChangeArgs } from 'preact-router'
import { Router } from 'preact-router'
import { useMemo, useState } from 'preact/hooks'
import '../styles/global.css'
import '../styles/nodes.css'
import { Analytics } from './Analytics'
import { Header } from './components'
import { Category, Changelog, Generator, Home, Project, Sounds } from './pages'
import { getProject } from './services'
import { cleanUrl } from './Utils'

export function App() {
	const [projectName] = useState<string>('Drafts')
	const project = useMemo(() => {
		return getProject(projectName) ?? getProject('Drafts')!
	}, [projectName])

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
			<Project path="/project" {...{project}} />
			<Generator default {...{project}} />
		</Router>
	</>
}

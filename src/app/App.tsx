import type { RouterOnChangeArgs } from 'preact-router'
import { getCurrentUrl, Router } from 'preact-router'
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'
import config from '../config.json'
import '../styles/global.css'
import '../styles/nodes.css'
import { Analytics } from './Analytics'
import { Header } from './components'
import { useLocale } from './contexts'
import { Category, Changelog, Generator, Home, Project, Sounds } from './pages'
import type { VersionId } from './services'
import { getProject, VersionIds } from './services'
import { Store } from './Store'
import { cleanUrl, getSearchParams, setSeachParams } from './Utils'

const VERSIONS_IN_TITLE = 3

export function App() {
	const { locale } = useLocale()

	const searchParams = getSearchParams(getCurrentUrl())
	const targetVersion = searchParams.get('version')
	const [version, setVersion] = useState<VersionId>(Store.getVersion())
	const changeVersion = useCallback((version: VersionId) => {
		if (getSearchParams(getCurrentUrl()).has('version')) {
			setSeachParams({ version })
		}
		Analytics.setVersion(version)
		Store.setVersion(version)
		setVersion(version)
	}, [targetVersion])
	useEffect(() => {
		if (VersionIds.includes(targetVersion as VersionId) && version !== targetVersion) {
			setVersion(targetVersion as VersionId)
		}
	}, [version, targetVersion])

	const [projectName] = useState<string>('Drafts')
	const project = useMemo(() => {
		return getProject(projectName) ?? getProject('Drafts')!
	}, [projectName])

	const [title, setTitle] = useState<string>(locale('title.home'))
	const changeTitle = (title: string, versions?: VersionId[]) => {
		versions ??= config.versions.map(v => v.id as VersionId)
		const titleVersions = versions.slice(versions.length - VERSIONS_IN_TITLE)
		document.title = `${title} Minecraft ${titleVersions.join(', ')}`
		setTitle(title)
	}

	const changeRoute = (e: RouterOnChangeArgs) => {
		// Needs a timeout to ensure the title is set correctly
		setTimeout(() => Analytics.pageview(cleanUrl(e.url)))
	}

	return <>
		<Header {...{title, version}} />
		<Router onChange={changeRoute}>
			<Home path="/" {...{changeTitle}} />
			<Category path="/worldgen" category="worldgen" {...{changeTitle}} />
			<Category path="/assets" category="assets" {...{changeTitle}} />
			<Sounds path="/sounds" {...{version, changeTitle, changeVersion}} />
			<Changelog path="/changelog" {...{changeTitle}} />
			<Project path="/project" {...{project}} />
			<Generator default {...{version, changeTitle, changeVersion, project}} />
		</Router>
	</>
}

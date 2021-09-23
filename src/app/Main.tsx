import { render } from 'preact'
import type { RouterOnChangeArgs } from 'preact-router'
import { Router } from 'preact-router'
import { useEffect, useState } from 'preact/hooks'
import config from '../config.json'
import '../styles/global.css'
import '../styles/nodes.css'
import { Analytics } from './Analytics'
import { Header } from './components'
import { loadLocale, locale, Locales } from './Locales'
import { FieldSettings, Generator, Home, Worldgen } from './pages'
import type { VersionId } from './Schemas'
import { Store } from './Store'
import { cleanUrl } from './Utils'

const VERSIONS_IN_TITLE = 3

function Main() {
	const [lang, setLanguage] = useState<string>('en')
	const changeLanguage = async (language: string) => {
		if (!Locales[language]) {
			await loadLocale(language)
		}
		Analytics.setLanguage(language)
		Store.setLanguage(language)
		setLanguage(language)
	}
	useEffect(() => {
		(async () => {
			const target = Store.getLanguage()
			await Promise.all([
				loadLocale('en'),
				...(target !== 'en' ? [loadLocale(target)] : []),
			])
			setLanguage(target)
		})()
	}, [])

	const [theme, setTheme] = useState<string>(Store.getTheme())
	const changeTheme = (theme: string) => {
		Analytics.setTheme(theme)
		Store.setTheme(theme)
		setTheme(theme)
	}
	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme)
	}, [theme])

	const [version, setVersion] = useState<VersionId>(Store.getVersion())
	const changeVersion = (version: VersionId) => {
		Analytics.setVersion(version)
		Store.setVersion(version)
		setVersion(version)
	}

	const [title, setTitle] = useState<string>(locale(lang, 'title.home'))
	const changeTitle = (title: string, versions?: VersionId[]) => {
		versions ??= config.versions.map(v => v.id as VersionId)
		versions.splice(0, versions.length - VERSIONS_IN_TITLE)
		document.title = `${title} Minecraft ${versions.join(', ')}`
		setTitle(title)
	}

	const changeRoute = (e: RouterOnChangeArgs) => {
		// Needs a timeout to ensure the title is set correctly
		setTimeout(() => Analytics.pageview(cleanUrl(e.url)))
	}

	return <>
		<Header {...{lang, title, version, theme, language: lang, changeLanguage, changeTheme}} />
		<Router onChange={changeRoute}>
			<Home path="/" {...{lang, changeTitle}} />
			<FieldSettings path="/settings/fields" {...{lang, changeTitle}} />
			<Worldgen path="/worldgen" {...{lang, changeTitle}} />
			<Generator default {...{lang, version, changeTitle}} onChangeVersion={changeVersion} />
		</Router>
	</>
}

render(<Main />, document.body)

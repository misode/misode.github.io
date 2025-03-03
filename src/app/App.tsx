import type { RouterOnChangeArgs } from 'preact-router'
import { route, Router } from 'preact-router'
import '../styles/global.css'
import '../styles/nodes.css'
import { Analytics } from './Analytics.js'
import { Header } from './components/index.js'
import { Changelog, Convert, Customized, Generator, Generators, Guide, Guides, Home, LegacyPartners, Partners, Sounds, Transformation, Versions, WhatsNew, Worldgen } from './pages/index.js'
import { cleanUrl } from './Utils.js'

declare var __BASE_DIRECTORY__: string
export const BASE_URL = __BASE_DIRECTORY__ ?? ''

export function appRoute(url: string, replace?: boolean): boolean {
	const pathUrl = urlPath(url)
	return route({
		url: pathUrl,
		replace: replace,
	})
}

export function assetPath(path: string): string {
	return urlPath(path)
}
export function urlPath(path: string): string {
	return path.startsWith("/") ? `${BASE_URL}${path}` : path
}

// Appends the base prefix to all local hrefs
function updateLinks() {
	if (!BASE_URL)
		return
	let links = document.links
	for (let i = 0; i < links.length; i++) {
		const link = links[i]
		if (link.getAttribute('href')?.startsWith("/") && !link.getAttribute('href')?.startsWith(BASE_URL)) {
			link.href = BASE_URL + link.getAttribute('href')
		}
	}
	let images = document.images
	for (let i = 0; i < images.length; i++) {
		const image = images[i]
		if (image.getAttribute('src')?.startsWith("/") && !image.getAttribute('src')?.startsWith(BASE_URL)) {
			image.src = BASE_URL + image.getAttribute('src')
		}
	}
}

export function App() {
	const changeRoute = (e: RouterOnChangeArgs) => {
		window.dispatchEvent(new CustomEvent('replacestate'))
		// Needs a timeout to ensure the title is set correctly
		setTimeout(() => Analytics.pageview(cleanUrl(e.url)))
	}

	new MutationObserver(updateLinks)
		.observe(document.body, { childList: true, subtree: true })

	return <>
		<Header />
		<Router onChange={changeRoute}>
			<Home path={urlPath("/")} />
			<Generators path={urlPath("/generators")} />
			<Worldgen path={urlPath("/worldgen")} />
			<Partners path={urlPath("/partners")} />
			<LegacyPartners path={urlPath("/partners/:id")} />
			<Sounds path={urlPath("/sounds")} />
			<Changelog path={urlPath("/changelog")} />
			<Versions path={urlPath("/versions")} />
			<Transformation path={urlPath("/transformation")} />
			<Customized path={urlPath("/customized")} />
			<Convert path={urlPath("/convert")} />
			<Convert path={urlPath("/convert/:formats")} />
			<WhatsNew path={urlPath("/whats-new")} />
			<Guides path={urlPath("/guides")} />
			<Guide path={urlPath("/guides/:id")} />
			<Generator default />
		</Router>
	</>
}

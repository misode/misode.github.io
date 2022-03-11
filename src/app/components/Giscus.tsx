import { Giscus as GiscusReact } from '@giscus/react'
import { useTheme } from '../contexts'

export function Giscus() {
	const { actualTheme } = useTheme()
	const themeSuffix = actualTheme === 'light' ? '-burn' : ''
	const themeUrl = (import.meta as any).env.DEV
		? `http://localhost:3000/src/styles/giscus${themeSuffix}.css`
		: `https://${location.host}/assets/giscus${themeSuffix}.css`

	return <GiscusReact
		repo="misode/misode.github.io"
		repoId="MDEwOlJlcG9zaXRvcnkxOTIyNTQyMzA="
		category="Site"
		categoryId="DIC_kwDOC3WRFs4COB8r"
		mapping="pathname"
		reactionsEnabled="1"
		emitMetadata="0"
		inputPosition="top"
		theme={themeUrl}
		lang="en" />
}

import { Giscus as GiscusReact } from '@giscus/react'
import { useTheme } from '../contexts/index.js'

interface Props {
	term?: string,
}
export function Giscus({ term }: Props) {
	const { actualTheme } = useTheme()
	const themeSuffix = actualTheme === 'light' ? '-burn' : ''
	const themeUrl = (import.meta as any).env.DEV
		? `http://localhost:3000/src/styles/giscus${themeSuffix}.css`
		: `${location.protocol}//${location.host}/assets/giscus${themeSuffix}.css`

	return <div class="giscus-container">
		<GiscusReact
			repo="misode/misode.github.io"
			repoId="MDEwOlJlcG9zaXRvcnkxOTIyNTQyMzA="
			category="Site"
			categoryId="DIC_kwDOC3WRFs4COB8r"
			mapping={term ? 'specific' : 'pathname'}
			term={term}
			reactionsEnabled="1"
			emitMetadata="0"
			inputPosition="top"
			theme={themeUrl}
			lang="en" />
	</div>
}

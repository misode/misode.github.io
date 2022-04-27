import hljs from 'highlight.js'
import { marked } from 'marked'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { Btn, BtnMenu, Giscus, Octicon } from '../components'
import { useLocale, useTitle, useVersion } from '../contexts'
import type { VersionId } from '../services'
import { parseFrontMatter } from '../Utils'

interface Props {
	path?: string
	id?: string
}
export function Guide({ id }: Props) {
	const { locale } = useLocale()
	const { version, changeVersion } = useVersion()

	const [content, setContent] = useState<string | undefined>(undefined)

	const frontMatter = useMemo(() => {
		return content && parseFrontMatter(content)
	}, [content])

	useTitle(frontMatter?.title, frontMatter?.versions?.split(' '))

	const guideVersion = useMemo(() => {
		if (!frontMatter?.versions) return version
		const allowedVersions: string[] = frontMatter.versions.split(' ')
		if (allowedVersions.includes(version)) return version
		return allowedVersions[allowedVersions.length - 1]
	}, [version, frontMatter?.versions])

	const html = useMemo(() => {
		return content && marked(content.substring(content.indexOf('---', 3) + 3), {
			highlight: (code, lang) => {
				if (lang === '') return undefined
				return hljs.highlight(code, { language: lang }).value
			},
		})
	}, [content])


	useEffect(() => {
		(async () => {
			const res = await fetch(`../../guides/${id}.md`)
			const text = await res.text()
			setContent(text)
		})()
	}, [id])

	return <main>
		<div class="guide">
			<div class="navigation">
				<a class="btn btn-link" href="/guides/">
					{Octicon.arrow_left}
					{locale('guides.all')}
				</a>
				{frontMatter?.versions && <BtnMenu icon="tag" label={guideVersion}>
					{frontMatter.versions.split('\n').map((v: string) =>
						<Btn label={v} onClick={() => changeVersion(v as VersionId)} />)}
				</BtnMenu>}
			</div>
			{html && <>
				<div class="guide-content" dangerouslySetInnerHTML={{ __html: html }}></div>
				<Giscus />
			</>}
		</div>
	</main>
}

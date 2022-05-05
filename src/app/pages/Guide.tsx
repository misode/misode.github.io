import hljs from 'highlight.js'
import { marked } from 'marked'
import { useEffect, useMemo, useState } from 'preact/hooks'
import config from '../../config.json'
import { Btn, BtnMenu, Giscus, Octicon } from '../components'
import { useLocale, useTitle, useVersion } from '../contexts'
import type { VersionId } from '../services'
import { parseFrontMatter, versionContent } from '../Utils'

interface Props {
	path?: string
	id?: string
}
export function Guide({ id }: Props) {
	const { locale } = useLocale()
	const { version, changeVersion } = useVersion()

	const [content, setContent] = useState<string | undefined>(undefined)

	const frontMatter = useMemo(() => {
		if (!content) return undefined
		return parseFrontMatter(content)
	}, [content])

	useTitle(frontMatter?.title, frontMatter?.versions)

	const allowedVersions = useMemo(() => {
		console.log(frontMatter?.versions)
		const orderedVersions = config.versions.map(v => v.id)
		return (frontMatter?.versions as string[])
			?.sort((a, b) => orderedVersions.indexOf(b) - orderedVersions.indexOf(a))
	}, [frontMatter?.versions])

	const guideVersion = useMemo(() => {
		if (!allowedVersions) return version
		if (allowedVersions.includes(version)) return version
		return allowedVersions[0]
	}, [version, frontMatter?.versions])

	const versionedContent = useMemo(() => {
		if (!content) return undefined
		const guide = content.substring(content.indexOf('---', 3) + 3)
		return versionContent(guide, guideVersion)
	}, [guideVersion, content])

	const html = useMemo(() => {
		if (!versionedContent) return undefined
		return marked(versionedContent, {
			highlight: (code, lang) => {
				if (lang === '') return undefined
				return hljs.highlight(code, { language: lang }).value
			},
		})
	}, [versionedContent])


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
				{allowedVersions && <BtnMenu icon="tag" label={guideVersion}>
					{allowedVersions.map((v: string) =>
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

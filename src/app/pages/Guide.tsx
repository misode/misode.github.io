import hljs from 'highlight.js'
import { marked } from 'marked'
import { route } from 'preact-router'
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'
import config from '../../config.json'
import { Ad, Btn, BtnMenu, ChangelogTag, Giscus, Octicon } from '../components'
import { useLocale, useTitle, useVersion } from '../contexts'
import { useActiveTimeout, useHash } from '../hooks'
import type { VersionId } from '../services'
import { parseFrontMatter, versionContent } from '../Utils'

const HASH = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M6.368 1.01a.75.75 0 01.623.859L6.57 4.5h3.98l.46-2.868a.75.75 0 011.48.237L12.07 4.5h2.18a.75.75 0 010 1.5h-2.42l-.64 4h2.56a.75.75 0 010 1.5h-2.8l-.46 2.869a.75.75 0 01-1.48-.237l.42-2.632H5.45l-.46 2.869a.75.75 0 01-1.48-.237l.42-2.632H1.75a.75.75 0 010-1.5h2.42l.64-4H2.25a.75.75 0 010-1.5h2.8l.46-2.868a.75.75 0 01.858-.622zM9.67 10l.64-4H6.33l-.64 4h3.98z"></path></svg>'

marked.use({
	highlight: (code, lang) => {
		if (lang === '') return undefined
		return hljs.highlight(code, { language: lang }).value
	},
})

interface Props {
	path?: string
	id?: string
}
export function Guide({ id }: Props) {
	const { locale } = useLocale()
	const { version, changeVersion } = useVersion()
	const { changeTitle } = useTitle()

	const [content, setContent] = useState<string | undefined>(undefined)

	const frontMatter = useMemo(() => {
		if (!content) return undefined
		const data = parseFrontMatter(content)
		changeTitle(data?.title, data?.versions)
		return data
	}, [content])

	const allowedVersions = useMemo(() => {
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
		marked.use({ renderer: {
			link(href, title, text) {
				if (href === null) return text
				const title2 = title ? ` title="${title}"` : '' 
				const target = href?.match(/^https?:\/\//) ? ' target="_blank"' : ''
				return `<a href="${href}"${title2}${target}>${text}</a>`
			},
			heading(text, level, raw, slugger) {
				const id = slugger.slug(raw)
				const link = `<span id="guide-${id}" href="?version=${version}#${id}">${HASH}</span>`
				return `<h${level}>${link}${text}</h${level}>`
			},
		}})
		return marked(versionedContent, { version: '1.19' } as any)
	}, [versionedContent])

	const [hash, setHash] = useHash()

	const scrollToHeading = useCallback(() => {
		if (!html) return
		const heading = document.querySelector(`[id=guide-${hash.slice(1)}]`)
		if (heading) {
			const top = heading.getBoundingClientRect().top + window.scrollY
			window.scrollTo({ top: top - 68, behavior: 'smooth' })
		}
	}, [html, hash])

	useEffect(() => {
		scrollToHeading()
	}, [html === undefined, hash])

	const clickGuideContent = useCallback((e: MouseEvent) => {
		if (!(e.target instanceof HTMLSpanElement)) return
		const targetHash = '#' + e.target.id.replace(/^guide-/, '')
		changeVersion(version, false, true)
		setHash(targetHash)
		if (targetHash === hash) {
			scrollToHeading()
		}
	}, [scrollToHeading, hash, version])

	useEffect(() => {
		(async () => {
			const res = await fetch(`../../guides/${id}.md`)
			const text = await res.text()
			setContent(text)
		})()
	}, [id])

	const [shareActive, shareSuccess] = useActiveTimeout()

	const onShare = useCallback(() => {
		const url = `${location.origin}/guides/${id}/?version=${version}`
		navigator.clipboard.writeText(url)
		shareSuccess()
	}, [id, version])

	const onClickTag = (tag: string) => {
		route(`/guides/?tags=${tag}`)
	}

	const [largeWidth] = useState(window.innerWidth > 600)

	return <main>
		<div class="guide">
			<div class="navigation">
				<a class="btn btn-link" href="/guides/">
					{Octicon.arrow_left}
					{locale('guides.all')}
				</a>
				<Btn icon={shareActive ? 'check' : 'link'} label={locale('share')} onClick={onShare} active={shareActive} tooltip={locale(shareActive ? 'copied' : 'copy_share')}/>
				{allowedVersions && <BtnMenu icon="tag" label={guideVersion} tooltip={locale('switch_version')}>
					{allowedVersions.map((v: string) =>
						<Btn label={v} onClick={() => changeVersion(v as VersionId)} />)}
				</BtnMenu>}
			</div>
			{(frontMatter?.tags && frontMatter.tags.length > 0) && <div class="guide-tags">
				{frontMatter.tags.map((tag: string) =>
					<ChangelogTag label={tag} active onClick={() => onClickTag(tag)} />
				)}
			</div>}
			{html && <>
				<Ad id="guide" type={largeWidth ? 'image' : 'text'} />
				<div class="guide-content" dangerouslySetInnerHTML={{ __html: html }} onClick={clickGuideContent}></div>
				<Giscus />
			</>}
		</div>
	</main>
}

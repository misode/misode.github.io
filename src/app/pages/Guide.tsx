import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import { marked } from 'marked'
import { route } from 'preact-router'
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'
import { Ad, Badge, Btn, Footer, Giscus, Icons, Octicon, VersionSwitcher } from '../components/index.js'
import config from '../Config.js'
import { useLocale, useTitle, useVersion } from '../contexts/index.js'
import { useActiveTimeout, useAsync, useHash } from '../hooks/index.js'
import type { VersionId } from '../services/index.js'
import { parseFrontMatter, versionContent } from '../Utils.js'

const HASH = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M6.368 1.01a.75.75 0 01.623.859L6.57 4.5h3.98l.46-2.868a.75.75 0 011.48.237L12.07 4.5h2.18a.75.75 0 010 1.5h-2.42l-.64 4h2.56a.75.75 0 010 1.5h-2.8l-.46 2.869a.75.75 0 01-1.48-.237l.42-2.632H5.45l-.46 2.869a.75.75 0 01-1.48-.237l.42-2.632H1.75a.75.75 0 010-1.5h2.42l.64-4H2.25a.75.75 0 010-1.5h2.8l.46-2.868a.75.75 0 01.858-.622zM9.67 10l.64-4H6.33l-.64 4h3.98z"></path></svg>'

hljs.registerLanguage('json', json)

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

	const { value: content, refresh } = useAsync(async () => {
		const res = await fetch(`../../guides/${id}.md`)
		return await res.text()
	}, [id])

	if ((import.meta as any).hot) {
		(import.meta as any).hot.on('guide-update', (updateId: string) => {
			if (id === updateId) refresh()
		})
	}

	const frontMatter = useMemo(() => {
		if (!content) return undefined
		const data = parseFrontMatter(content)
		changeTitle(data?.title, data?.versions)
		return data
	}, [content])

	const allowedVersions = useMemo(() => {
		const orderedVersions = config.versions.map(v => v.id)
		return (frontMatter?.versions as VersionId[])
			?.sort((a, b) => orderedVersions.indexOf(b) - orderedVersions.indexOf(a))
	}, [frontMatter?.versions])

	const guideVersion = useMemo(() => {
		if (!allowedVersions) return version
		if (allowedVersions.includes(version)) return version
		return allowedVersions[0]
	}, [version, frontMatter?.versions])

	const html = useMemo(() => {
		if (!content) return undefined
		const headings: marked.Tokens.Heading[] = []
		let insertedToc = false
		marked.use({
			extensions: [
				{
					name: 'styledCode',
					level: 'inline',
					start(src) {
						return src.match(/\b[fsnj]`/)?.index ?? -1
					},
					tokenizer(src) {
						const match = src.match(/^([fsnj])`([^`]+)`/)
						if (match) {
							return {
								type: 'styledCode',
								raw: match[0],
								prefix: match[1],
								text: match[2],
							}
						}
						return undefined
					},
					renderer(token) {
						let content = token.text
						let c = {
							f: 'hljs-attr',
							s: 'hljs-string',
							n: 'hljs-number',
						}[token.prefix as string]
						if (token.prefix === 'j') {
							content = hljs.highlight('json', token.text).value
							c = 'language-json'
						}
						return `<code${c ? ` class="${c}"` : ''}>${content}</code>`
					},
				},
			],
			walkTokens(token) {
				if (token.type === 'heading') {
					headings.push(token)
				}
			},
			renderer: {
				link(href, title, text) {
					if (href === null) return text
					const title2 = title ? ` title="${title}"` : '' 
					const target = href?.match(/^https?:\/\//) ? ' target="_blank"' : ''
					return `<a href="${href}"${title2}${target}>${text}</a>`
				},
				heading(text, level, raw, slugger) {
					let toc = ''
					if (!insertedToc) {
						toc = `<ol class="guide-toc">${headings.filter(t => t.depth === 2).map(t => {
							const id = slugger.slug(t.raw.match(/^#+ (.*)/)?.[1] ?? '', { dryrun: true })
							const text = t.text.replaceAll('`', '')
							return `<li><a href="#${id}">${text}</a></li>`
						}).join('')}</ol>`
						insertedToc = true
					}
					const id = slugger.slug(raw)
					const link = `<span id="guide-${id}" href="?version=${version}#${id}">${HASH}</span>`
					return `${toc}<h${level}>${link}${text}</h${level}>`
				},
			},
		})
		const guide = content.substring(content.indexOf('---', 3) + 3)
		const versionedContent = versionContent(guide, guideVersion)
		return marked(versionedContent, { version: '1.19' } as any)
	}, [guideVersion, content])

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

	const [shareActive, shareSuccess] = useActiveTimeout()

	const onShare = useCallback(() => {
		const url = `${location.origin}/guides/${id}/?version=${version}`
		navigator.clipboard.writeText(url)
		shareSuccess()
	}, [id, version])

	const onClickTag = useCallback((tag: string) => {
		route(`/guides/?tags=${tag}`)
	}, [])

	const [largeWidth] = useState(window.innerWidth > 600)

	return <main>
		<div class="container guide">
			<div class="navigation">
				<a class="btn btn-link" href="/guides/">
					{Octicon.arrow_left}
					<span>{locale('guides.all')}</span>
				</a>
				{frontMatter?.tags?.includes('worldgen') && <a class="btn btn-link" href="/worldgen/">
					{Icons.worldgen}
					<span>{locale('worldgen')}</span>
				</a>}
				<div class="navigation-divider" />
				<Btn icon={shareActive ? 'check' : 'link'} label={locale('share')} onClick={onShare} active={shareActive} tooltip={locale(shareActive ? 'copied' : 'copy_share')} class="guide-share" />
				{allowedVersions && <VersionSwitcher value={guideVersion} allowed={allowedVersions} onChange={changeVersion} />}
			</div>
			{(frontMatter?.tags && frontMatter.tags.length > 0) && <div class="badges-list">
				{frontMatter.tags.map((tag: string) =>
					<Badge label={tag} active onClick={() => onClickTag(tag)} />
				)}
			</div>}
			{html && <>
				<Ad id="guide" type={largeWidth ? 'image' : 'text'} />
				<div class="guide-content" dangerouslySetInnerHTML={{ __html: html }} onClick={clickGuideContent}></div>
				<Giscus />
			</>}
		</div>
		<Footer />
	</main>
}

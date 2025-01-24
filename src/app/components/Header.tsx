import { getCurrentUrl, Link } from 'preact-router'
import { useCallback, useMemo, useRef, useState } from 'preact/hooks'
import type { ConfigGenerator } from '../Config.js'
import config from '../Config.js'
import { useLocale, useTheme, useTitle, useVersion } from '../contexts/index.js'
import { useFocus } from '../hooks/useFocus.js'
import { cleanUrl, getGenerator, SOURCE_REPO_URL } from '../Utils.js'
import { Btn, BtnMenu, Icons, Octicon } from './index.js'

const Themes: Record<string, keyof typeof Octicon> = {
	system: 'device_desktop',
	dark: 'moon',
	light: 'sun',
}

export function Header() {
	const { lang, locale, changeLocale: changeLanguage } = useLocale()
	const { theme, changeTheme } = useTheme()
	const { title } = useTitle()
	const url = getCurrentUrl()
	const gen = getGenerator(url)

	return <header>
		<div class="title flex items-center">
			<Link class="home-link pr-1" href="/" aria-label={locale('home')}>{Icons.home}</Link>
			{gen
				? <GeneratorTitle title={title} gen={gen} />
				: <h1 class="font-bold px-1 text-lg sm:text-2xl">{title}</h1>}
		</div>
		<nav>
			<ul>
				<li>
					<BtnMenu icon="globe" tooltip={locale('language')}>
						{config.languages.map(({ code, name }) =>
							<Btn label={name} active={code === lang}
								onClick={() => changeLanguage(code)} />
						)}
					</BtnMenu>
				</li>
				<li>
					<BtnMenu icon={Themes[theme]} tooltip={locale('theme')}>
						{Object.entries(Themes).map(([th, icon]) =>
							<Btn icon={icon} label={locale(`theme.${th}`)} active={th === theme}
								onClick={() => changeTheme(th)} />
						)}
					</BtnMenu>
				</li>
				<li class="dimmed">
					<a href={SOURCE_REPO_URL} target="_blank" rel="noreferrer" class="tooltipped tip-sw" aria-label={locale('github')}>
						{Octicon.mark_github}
					</a>
				</li>
			</ul>
		</nav>
	</header>
}

interface GeneratorTitleProps {
	title: string
	gen: ConfigGenerator
}
function GeneratorTitle({ title, gen }: GeneratorTitleProps) {
	const { locale } = useLocale()
	const { version } = useVersion()

	const [active, setActive] = useFocus()
	const [search, setSearch] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)

	const icon = Object.keys(Icons).includes(gen.id) ? gen.id as keyof typeof Icons : undefined

	const generators = useMemo(() => {
		let result = config.generators
			.filter(g => !g.dependency)
			.map(g => ({ ...g, name: locale(`generator.${g.id}`).toLowerCase() }))
		if (search) {
			const parts = search.split(' ')
			result = result.filter(g => parts.some(p => g.name.includes(p))
				|| parts.some(p => g.tags?.some(t => t.includes(p)) ?? false))
		}
		result.sort((a, b) => a.name.localeCompare(b.name))
		if (search) {
			result.sort((a, b) => (b.name.startsWith(search) ? 1 : 0) - (a.name.startsWith(search) ? 1 : 0))
		}
		return result
	}, [locale, version, search])

	const open = useCallback(() => {
		setActive(true)
		setTimeout(() => {
			inputRef.current?.select()
		})
	}, [setActive, inputRef])

	return <div class="px-1 relative">
		<h1 class="font-bold flex items-center cursor-pointer text-lg sm:text-2xl" onClick={open}>
			{title}
			{icon && Icons[icon]}
		</h1>
		<div class={`gen-menu absolute flex flex-col gap-2 p-2 rounded-lg drop-shadow-xl ${active ? '' : 'hidden'}`}>
			<input ref={inputRef} type="text" class="py-1 px-2 w-full rounded" value={search} placeholder={locale('generators.search')} onInput={(e) => setSearch((e.target as HTMLInputElement).value)} onClick={e => e.stopPropagation()} />
			{active && <div class="gen-results overflow-y-auto overscroll-none flex flex-col pr-2 h-96 max-h-max min-w-max">
				{generators.length === 0 && <span class="note">{locale('generators.no_results')}</span>}
				{generators.map(g =>
					<Link class="flex items-center cursor-pointer no-underline rounded p-1" href={cleanUrl(g.url)} onClick={() => setActive(false)}>
						{locale(`generator.${g.id}`)}
						{Object.keys(Icons).includes(g.id) ? Icons[g.id as keyof typeof Icons] : undefined}
					</Link>
				)}
			</div>}
		</div>
	</div>
}

import { getCurrentUrl, Link } from 'preact-router'
import { useCallback } from 'preact/hooks'
import type { ConfigGenerator } from '../Config.js'
import config from '../Config.js'
import { useLocale, useTheme, useTitle, useVersion } from '../contexts/index.js'
import { cleanUrl, getGenerator, SOURCE_REPO_URL } from '../Utils.js'
import { FancyMenu } from './FancyMenu.jsx'
import { searchGenerators } from './generator/GeneratorList.jsx'
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

	const icon = Object.keys(Icons).includes(gen.id) ? gen.id as keyof typeof Icons : undefined

	const getGenerators = useCallback((search: string, close: () => void) => {
		let results = config.generators
			.filter(g => !g.dependency)
			.map(g => ({ ...g, name: locale(`generator.${g.id}`).toLowerCase() }))
		results = searchGenerators(results, search)
		if (results.length === 0) {
			return [<span class="note">{locale('generators.no_results')}</span>]
		}
		return results.map(g =>
			<Link class="flex items-center cursor-pointer no-underline rounded p-1" href={cleanUrl(g.url)} onClick={close}>
				{locale(`generator.${g.id}`)}
				{Object.keys(Icons).includes(g.id) ? Icons[g.id as keyof typeof Icons] : undefined}
				<div class="m-auto"></div>
				{g.tags?.filter(t => t === 'assets').map(t =>
					<div class="badge ml-2 mr-0 text-sm" style="--color: #555;">{t}</div>
				)}
			</Link>
		)
	}, [locale, version])

	return <FancyMenu getResults={getGenerators} placeholder={locale('generators.search')}>
		<h1 class="font-bold flex items-center cursor-pointer text-lg sm:text-2xl">
			{title}
			{icon && Icons[icon]}
		</h1>
	</FancyMenu>
}

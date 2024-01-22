import { getCurrentUrl, Link, route } from 'preact-router'
import config from '../Config.js'
import { useLocale, useProject, useTheme, useTitle, useVersion } from '../contexts/index.js'
import { checkVersion } from '../services/index.js'
import { cleanUrl, getGenerator } from '../Utils.js'
import { Btn, BtnMenu, Icons, Octicon } from './index.js'

const Themes: Record<string, keyof typeof Octicon> = {
	system: 'device_desktop',
	dark: 'moon',
	light: 'sun',
}

export function Header() {
	const { lang, locale, changeLocale: changeLanguage } = useLocale()
	const { theme, changeTheme } = useTheme()
	const { version } = useVersion()
	const { projects, project, changeProject } = useProject()
	const { title } = useTitle()
	const url = getCurrentUrl()
	const gen = getGenerator(url)

	return <header>
		<div class="title">
			<Link class="home-link" href="/" aria-label={locale('home')} data-cy="home-link">{Icons.home}</Link>
			<h1 class="font-bold">{title}</h1>
			{gen && <BtnMenu icon="chevron_down" tooltip={locale('switch_generator')} data-cy="generator-switcher">
				{config.generators
					.filter(g => g.tags?.[0] === gen?.tags?.[0] && checkVersion(version, g.minVersion))
					.map(g =>
						<Btn label={locale(`generator.${g.id}`)} active={g.id === gen.id} onClick={() => route(cleanUrl(g.url))} />
					)}
			</BtnMenu>}
			{!gen && url.match(/\/?project\/?$/) && <BtnMenu icon="chevron_down" tooltip={locale('switch_project')}>
				{projects.map(p =>
					<Btn label={p.name} active={p.name === project.name} onClick={() => changeProject(p.name)} />
				)}
			</BtnMenu>}
		</div>
		<nav>
			<ul>
				<li data-cy="language-switcher">
					<BtnMenu icon="globe" tooltip={locale('language')}>
						{config.languages.map(({ code, name }) =>
							<Btn label={name} active={code === lang}
								onClick={() => changeLanguage(code)} />
						)}
					</BtnMenu>
				</li>
				<li data-cy="theme-switcher">
					<BtnMenu icon={Themes[theme]} tooltip={locale('theme')}>
						{Object.entries(Themes).map(([th, icon]) =>
							<Btn icon={icon} label={locale(`theme.${th}`)} active={th === theme}
								onClick={() => changeTheme(th)} />
						)}
					</BtnMenu>
				</li>
				<li class="dimmed">
					<a href="https://github.com/misode/misode.github.io" target="_blank" rel="noreferrer" class="tooltipped tip-sw" aria-label={locale('github')}>
						{Octicon.mark_github}
					</a>
				</li>
			</ul>
		</nav>
	</header>
}

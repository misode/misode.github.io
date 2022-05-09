import { getCurrentUrl, Link, route } from 'preact-router'
import { Btn, BtnMenu, Icons, Octicon } from '.'
import config from '../../config.json'
import { useLocale, useTheme, useTitle, useVersion } from '../contexts'
import { checkVersion } from '../services'
import { cleanUrl, getGenerator } from '../Utils'

const Themes: Record<string, keyof typeof Octicon> = {
	system: 'device_desktop',
	dark: 'moon',
	light: 'sun',
}

export function Header() {
	const { lang, locale, changeLocale: changeLanguage } = useLocale()
	const { theme, changeTheme } = useTheme()
	const { version } = useVersion()
	const { title } = useTitle()
	const gen = getGenerator(getCurrentUrl())

	return <header>
		<div class="title">
			<Link class="home-link" href="/" aria-label={locale('home')} data-cy="home-link">{Icons.home}</Link>
			<h1>{title}</h1>
			{gen && <BtnMenu icon="chevron_down" tooltip={locale('switch_generator')} data-cy="generator-switcher">
				{config.generators
					.filter(g => g.category === gen?.category && checkVersion(version, g.minVersion))
					.map(g =>
						<Btn label={locale(g.id)} active={g.id === gen.id} onClick={() => route(cleanUrl(g.url))} />
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

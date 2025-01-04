import { getCurrentUrl, Link, route } from 'preact-router'
import config from '../Config.js'
import { useLocale, useTheme, useTitle, useVersion } from '../contexts/index.js'
import { checkVersion } from '../services/index.js'
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
	const { version } = useVersion()
	const { title } = useTitle()
	const url = getCurrentUrl()
	const gen = getGenerator(url)

	return <header>
		<div class="title">
			<Link class="home-link" href="/" aria-label={locale('home')}>{Icons.home}</Link>
			<h1 class="font-bold">{title}</h1>
			{gen && <BtnMenu icon="chevron_down" tooltip={locale('switch_generator')}>
				{config.generators
					.filter(g => g.tags?.[0] === gen?.tags?.[0] && checkVersion(version, g.minVersion))
					.map(g =>
						<Btn label={locale(`generator.${g.id}`)} active={g.id === gen.id} onClick={() => route(cleanUrl(g.url))} />
					)}
			</BtnMenu>}
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

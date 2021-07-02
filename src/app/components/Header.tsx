import { getCurrentUrl, Link, route } from 'preact-router'
import { Btn, BtnMenu, Icons, Octicon } from '.'
import config from '../../config.json'
import { locale } from '../Locales'
import type { VersionId } from '../Schemas'
import { checkVersion } from '../Schemas'
import { cleanUrl, getGenerator } from '../Utils'

const Themes: Record<string, keyof typeof Octicon> = {
	system: 'device_desktop',
	dark: 'moon',
	light: 'sun',
}

type HeaderProps = {
	lang: string,
	title: string,
	version: VersionId,
	theme: string,
	changeTheme: (theme: string) => unknown,
	language: string,
	changeLanguage: (language: string) => unknown,
}
export function Header({ lang, title, version, theme, changeTheme, language, changeLanguage }: HeaderProps) {
	const loc = locale.bind(null, lang)
	const gen = getGenerator(getCurrentUrl())

	return <header>
		<div class="title">
			<Link class="home-link" href="/">{Icons.home}</Link>
			<h2>{title}</h2>
			{gen && <BtnMenu icon="chevron_down">
				{config.generators
					.filter(g => g.category === gen?.category && checkVersion(version, g.minVersion))
					.map(g =>
						<Btn label={loc(g.id)} active={g.id === gen.id} onClick={() => route(cleanUrl(g.url))} />
					)}
			</BtnMenu>}
		</div>
		<nav>
			<ul>
				<li>
					<BtnMenu icon="globe">
						{config.languages.map(({ code, name }) =>
							<Btn label={name} active={code === language}
								onClick={() => changeLanguage(code)} />
						)}
					</BtnMenu>
				</li>
				<li>
					<BtnMenu icon={Themes[theme]}>
						{Object.entries(Themes).map(([th, icon]) =>
							<Btn icon={icon} label={loc(`theme.${th}`)} active={th === theme}
								onClick={() => changeTheme(th)} />
						)}
					</BtnMenu>
				</li>
				<li class="dimmed">
					<a href="https://github.com/misode/misode.github.io" target="_blank" rel="noreferrer" title={loc('github')}>
						{Octicon.mark_github}
					</a>
				</li>
			</ul>
		</nav>
	</header>
}

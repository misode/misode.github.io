import { Link } from 'preact-router'
import config from '../../config.json'
import { Octicon } from '../components/Octicon'
import { locale } from '../Locales'
import { cleanUrl } from '../Utils'

type HomeProps = {
	lang: string,
	changeTitle: (title: string) => unknown,
	path?: string,
	category?: string,
}
export function Home({ lang, changeTitle, category }: HomeProps) {
	const loc = locale.bind(null, lang)
	changeTitle(category ? loc('title.generator_category', loc(category)) : loc('title.home'))
	return <main>
		<div class="home">
			<div class="generator-picker">
				<ul class="generators-list">
					{config.models.filter(m => typeof m.category !== 'string').map(m => <li>
						<Link class={`generators-card${m.category === true && m.id === category ? ' selected' : ''}`} href={cleanUrl(m.id)}>
							{loc(m.id)}
							{m.category && Octicon.chevron_right}
						</Link>
					</li>)}
				</ul>
				{(category && config.models.some(m => m.category === category)) &&
				<ul class="generators-list">
					{config.models.filter(m => m.category === category).map(m => <li>
						<Link class="generators-card" href={cleanUrl(m.id)}>
							{loc(m.id)}
						</Link>
					</li>)}
				</ul>}
			</div>
		</div>
	</main>
}

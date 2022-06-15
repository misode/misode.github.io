import { useLocale } from '../contexts/index.js'
import { Octicon } from './index.js'

interface Props {
	donate?: boolean,
}
export function Footer({ donate }: Props) {
	const { locale } = useLocale()

	return <footer>
		<p>
			<span>{locale('developed_by')} <a href="https://github.com/misode" target="_blank" rel="noreferrer">Misode</a></span>
		</p>
		{donate !== false && <p class="donate">
			{Octicon.heart}
			<a href="https://ko-fi.com/misode" target="_blank" rel="noreferrer">{locale('donate')}</a>
		</p>}
		<p>
			{Octicon.mark_github}
			<span>{locale('source_code_on')} <a href="https://github.com/misode/misode.github.io" target="_blank" rel="noreferrer">{locale('github')}</a></span>
		</p>
	</footer>
}

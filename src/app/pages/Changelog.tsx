import { Ad, ChangelogList, ErrorPanel, Footer } from '../components'
import { useLocale, useTitle } from '../contexts'
import { useAsync } from '../hooks'
import { getChangelogs } from '../services'

interface Props {
	path?: string,
}
export function Changelog({}: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.changelog'))

	const { value: changelogs, error } = useAsync(getChangelogs, [])

	return <main>
		<Ad type="text" id="changelog" />
		{error && <ErrorPanel error={error} />}
		<div class="changelog">
			<ChangelogList changes={changelogs} defaultOrder="desc" />
		</div>
		<Footer />
	</main>
}

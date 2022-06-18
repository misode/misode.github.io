import { Ad, ChangelogList, ErrorPanel, Footer } from '../components/index.js'
import { useLocale, useTitle } from '../contexts/index.js'
import { useAsync } from '../hooks/index.js'
import { getChangelogs } from '../services/index.js'

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
		<div class="container changelog">
			<ChangelogList changes={changelogs} defaultOrder="desc" />
		</div>
		<Footer />
	</main>
}

import { useEffect, useState } from 'preact/hooks'
import { Ad, ChangelogList, ErrorPanel } from '../components'
import { useLocale, useTitle } from '../contexts'
import type { Change } from '../services'
import { getChangelogs } from '../services'

interface Props {
	path?: string,
}
export function Changelog({}: Props) {
	const { locale } = useLocale()
	const [error, setError] = useState<Error | null>(null)
	useTitle(locale('title.changelog'))

	const [changelogs, setChangelogs] = useState<Change[]>([])
	useEffect(() => {
		getChangelogs()
			.then(changelogs => setChangelogs(changelogs))
			.catch(e => { console.error(e); setError(e) })
	}, [])


	return <main>
		<Ad type="text" id="changelog" />
		{error && <ErrorPanel error={error} onDismiss={() => setError(null)} />}
		<div class="changelog">
			<ChangelogList changes={changelogs} defaultOrder="desc" />
		</div>
	</main>
}

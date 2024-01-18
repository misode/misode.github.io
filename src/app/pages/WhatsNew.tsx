import { useEffect } from 'preact/hooks'
import { Store } from '../Store.js'
import { ErrorPanel, Footer } from '../components/index.js'
import { WhatsNewEntry } from '../components/whatsnew/WhatsNewEntry.jsx'
import { useLocale, useTitle } from '../contexts/index.js'
import { useActiveTimeout } from '../hooks/useActiveTimout.js'
import { useAsync } from '../hooks/useAsync.js'
import { fetchWhatsNew } from '../services/DataFetcher.js'

interface Props {
	path?: string,
}
export function WhatsNew({}: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.whats_new'))

	const { value: items, error } = useAsync(fetchWhatsNew)

	const [storeTime, startStoreTime] = useActiveTimeout()
	useEffect(() => {
		if (items !== undefined) {
			startStoreTime()
		}
	}, [items])
	useEffect(() => {
		if (items !== undefined && storeTime) {
			Store.seeWhatsNew(items.map(i => i.id))
		}
	}, [items, storeTime])

	return <main>
		<div class="legacy-container whats-new">
			<p>{locale('whats_new.description')}</p>
			{error && <ErrorPanel error={error} />}
			{items?.map(item => <WhatsNewEntry item={item} />)}
		</div>
		<Footer />
	</main>
}

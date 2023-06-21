import { marked } from 'marked'
import { ErrorPanel, Footer } from '../components/index.js'
import { useLocale, useTitle } from '../contexts/index.js'
import { useAsync } from '../hooks/useAsync.js'
import type { WhatsNewItem } from '../services/DataFetcher.js'
import { fetchWhatsNew } from '../services/DataFetcher.js'

interface Props {
	path?: string,
}
export function WhatsNew({}: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.whats_new'))

	const { value: items, error } = useAsync(fetchWhatsNew)

	return <main>
		<div class="container whats-new">
			<p>{locale('whats_new.description')}</p>
			{error && <ErrorPanel error={error} />}
			{items?.map(item => <WhatsNewEntry item={item} />)}
		</div>
		<Footer />
	</main>
}

interface EntryProps {
	item: WhatsNewItem,
}
function WhatsNewEntry({ item }: EntryProps) {
	return <article class="whats-new-entry">
		<a href={item.url} target="_blank">
			<time dateTime={item.createdAt} title={Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'long' }).format(new Date(item.createdAt))}>{Intl.DateTimeFormat(undefined, { day: 'numeric',month: 'long', year: 'numeric' }).format(new Date(item.createdAt))}</time>
			<h2>{item.title}</h2>
		</a>
		<div class="guide-content" dangerouslySetInnerHTML={{ __html: marked(item.body) }} />
	</article>
}

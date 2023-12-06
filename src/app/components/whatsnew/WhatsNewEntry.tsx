import { marked } from 'marked'
import type { WhatsNewItem } from '../../services/DataFetcher.js'
import { WhatsNewTime } from './WhatsNewTime.jsx'

interface EntryProps {
	item: WhatsNewItem,
}
export function WhatsNewEntry({ item }: EntryProps) {
	return <article class="whats-new-entry">
		<a href={item.url} target="_blank">
			<WhatsNewTime item={item} />
			<h2 class="font-bold text-[27px]">{item.title}</h2>
		</a>
		<div class="markdown-content" dangerouslySetInnerHTML={{ __html: marked(item.body) }} />
	</article>
}

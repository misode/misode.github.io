import { useLocale } from '../../contexts/Locale.jsx'
import type { WhatsNewItem } from '../../services/DataFetcher.js'

interface Props {
	item: WhatsNewItem,
	short?: boolean,
}
export function WhatsNewTime({ item, short }: Props) {
	const { locale } = useLocale()
	return <time dateTime={item.createdAt} title={Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'long' }).format(new Date(item.createdAt))}>
		{(!short || item.seenAt !== undefined) && Intl.DateTimeFormat(undefined, { day: 'numeric',month: 'long', year: 'numeric' }).format(new Date(item.createdAt))}
		{item.seenAt === undefined && <span class="new-badge">{locale('whats_new.new')}</span>}
	</time>
}

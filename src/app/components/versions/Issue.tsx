import type { Bugfix } from '../../services/DataFetcher.js'
import { Badge } from '../Badge.jsx'
import { Card } from '../Card.jsx'

interface Props {
	fix: Bugfix
}
export function Issue({ fix }: Props) {
	return <Card overlay={fix.id} link={`https://mojira.dev/${fix.id}`}>
		<div class="changelog-content">{fix.summary}</div>
		<div class="badges-list">
			{fix.categories.map(c => <Badge label={c} />)}
		</div>
	</Card>
}

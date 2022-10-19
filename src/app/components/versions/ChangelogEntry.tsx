import { marked } from 'marked'
import type { Change } from '../../services/index.js'
import { Card } from '../Card.jsx'
import { Badge } from './index.js'

type Props = {
	change: Change,
	minimal?: boolean,
	short?: boolean,
	activeTags?: string[],
	toggleTag?: (tag: string) => unknown,
}
export function ChangelogEntry({ change, minimal, short, activeTags, toggleTag }: Props) {
	return <Card overlay={!minimal && <>
		<a class="changelog-version" href={`/versions/?id=${change.version}`}>{change.version}</a>
		<a class="changelog-version" href={`/versions/?id=${change.group}`}>{change.group}</a>
	</>}>
		<div class="badges-list">
			{change.tags.map(tag => <Badge label={tag} onClick={toggleTag ? () => toggleTag(tag) : undefined} active={activeTags?.includes(tag)} />)}
		</div>
		<div class="changelog-content" dangerouslySetInnerHTML={{ __html: marked(short ? change.content.split('\n')[0] : change.content) }} />
	</Card>
}

import { marked } from 'marked'
import type { Change } from '../../services/index.js'
import { ChangelogTag } from './index.js'

type Props = {
	change: Change,
	activeTags?: string[],
	toggleTag?: (tag: string) => unknown,
}
export function ChangelogEntry({ change, activeTags, toggleTag }: Props) {
	return <div class="changelog-entry">
		<div class="changelog-version">
			<a href={`/versions/?id=${change.version}`}>{change.version}</a>
			<a href={`/versions/?id=${change.group}`}>{change.group}</a>
		</div>
		<div class="changelog-tags">
			{change.tags.map(tag => <ChangelogTag label={tag} onClick={toggleTag ? () => toggleTag(tag) : undefined} active={activeTags?.includes(tag)} />)}
		</div>
		<div class="changelog-content" dangerouslySetInnerHTML={{ __html: marked(change.content) }} />
	</div>
}

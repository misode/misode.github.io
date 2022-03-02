import { marked } from 'marked'
import { ChangelogTag } from '.'
import type { Change, ChangelogVersion } from '../../services'

type Props = {
	change: Change,
	activeTags?: string[],
	toggleTag?: (tag: string) => unknown,
}
export function ChangelogEntry({ change, activeTags, toggleTag }: Props) {
	return <div class="changelog-entry">
		<div class="changelog-version">
			<ArticleLink {...change.version}/>
			<ArticleLink {...change.group}/>
		</div>
		<div class="changelog-tags">
			{change.tags.map(tag => <ChangelogTag label={tag} onClick={toggleTag ? () => toggleTag(tag) : undefined} active={activeTags?.includes(tag)} />)}
		</div>
		<div class="changelog-content" dangerouslySetInnerHTML={{ __html: marked(change.content) }} />
	</div>
}

function ArticleLink({ id, article }: ChangelogVersion) {
	return article === null
		? <span>{id}</span>
		: <a href={`https://www.minecraft.net/en-us/article/${article}`} target="_blank">{id}</a>
}

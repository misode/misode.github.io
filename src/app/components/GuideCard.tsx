import { useMemo } from 'preact/hooks'
import { getGuide } from '../services/Guides.js'
import { Card } from './Card.jsx'
import { ChangelogTag } from './index.js'

interface Props {
	id: string,
	activeTags?: string[],
	toggleTag?: (tag: string) => unknown,
}
export function GuideCard({ id, activeTags, toggleTag }: Props) {
	const { title, versions, tags } = useMemo(() => getGuide(id)!, [id])

	const onToggleTag = (tag: string) => (e: MouseEvent) => {
		if (toggleTag) toggleTag(tag)
		e.preventDefault()
		e.stopImmediatePropagation()
	}

	return <Card title={title} overlay={versions?.join(' • ')} link={`/guides/${id}/`}>
		<div class="card-tags">
			{tags?.sort().map(tag => <ChangelogTag label={tag} onClick={onToggleTag(tag)} active={activeTags?.includes(tag)} />)}
		</div>
	</Card>
}

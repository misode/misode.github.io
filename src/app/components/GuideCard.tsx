import { useMemo } from 'preact/hooks'
import { getGuide } from '../services/Guides.js'
import { Card } from './Card.jsx'
import { Badge } from './index.js'

interface Props {
	id: string,
	minimal?: boolean,
	activeTags?: string[],
	toggleTag?: (tag: string) => unknown,
}
export function GuideCard({ id, minimal, activeTags, toggleTag }: Props) {
	const { title, versions, tags } = useMemo(() => getGuide(id), [id])

	const onToggleTag = (tag: string) => (e: MouseEvent) => {
		if (toggleTag) toggleTag(tag)
		e.preventDefault()
		e.stopImmediatePropagation()
	}

	return <Card title={title} overlay={!minimal && versions?.join(' • ')} link={`/guides/${id}/`}>
		<div class="badges-list">
			{tags?.sort().map(tag => <Badge label={tag} onClick={onToggleTag(tag)} active={activeTags?.includes(tag)} />)}
		</div>
	</Card>
}

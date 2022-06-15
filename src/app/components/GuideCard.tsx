import { ChangelogTag } from './index.js'

interface Props {
	title: string,
	link: string,
	versions: string[],
	tags: string[],
	activeTags?: string[],
	toggleTag?: (tag: string) => unknown,
}
export function GuideCard({ title, link, versions, tags, activeTags, toggleTag }: Props) {
	const onToggleTag = (tag: string) => (e: MouseEvent) => {
		if (toggleTag) toggleTag(tag)
		e.preventDefault()
		e.stopImmediatePropagation()
	}

	return <a class="guide-card" href={link} >
		<span class="guide-versions">{versions.join(' • ')}</span>
		<h3>{title}</h3>
		<div class="guide-tags">
			{tags.sort().map(tag => <ChangelogTag label={tag} onClick={onToggleTag(tag)} active={activeTags?.includes(tag)} />)}
		</div>
	</a>
}

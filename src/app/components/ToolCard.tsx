import type { ComponentChildren } from 'preact'
import { Icons } from './Icons.js'

type ToolCardProps = {
	title: string,
	desc?: string,
	link?: string,
	icon?: keyof typeof Icons,
	children?: ComponentChildren,
}
export function ToolCard({ title, desc, link, icon, children }: ToolCardProps) {
	const content = <>
		<div class="tool-head">
			{icon && Icons[icon]}
			<div>
				<h3>{title}</h3>
				<p>{desc}</p>
			</div>
		</div>
		{children && <div class="tool-body">
			{children}
		</div>}
	</>
	return link
		? <a class="tool-card" href={link}>{content}</a>
		: <div class="tool-card">{content}</div>
}

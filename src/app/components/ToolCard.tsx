import type { ComponentChildren } from 'preact'
import { Icons } from './Icons'

type ToolCardProps = {
	title: string,
	link: string,
	icon?: keyof typeof Icons,
	children?: ComponentChildren,
}
export function ToolCard({ title, link, icon, children }: ToolCardProps) {
	return <a class="tool-card" href={link}>
		{icon && Icons[icon]}
		<div>
			<h3>{title}</h3>
			{children}
		</div>
	</a>
}

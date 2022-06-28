import type { ComponentChildren } from 'preact'
import { Icons } from './Icons.js'
import { Octicon } from './Octicon.jsx'

type ToolCardProps = {
	title: string,
	desc?: string,
	link?: string,
	icon?: keyof typeof Icons,
	titleIcon?: keyof typeof Octicon | keyof typeof Icons,
	children?: ComponentChildren,
}
export function ToolCard({ title, desc, link, icon, titleIcon, children }: ToolCardProps) {
	const content = <>
		<div class="tool-head">
			{icon && Icons[icon]}
			<div>
				<h3>{title}{titleIcon && (titleIcon in Octicon ? (Octicon as any)[titleIcon] : (Icons as any)[titleIcon])}</h3>
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

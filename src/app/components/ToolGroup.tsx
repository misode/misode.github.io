import type { ComponentChildren } from 'preact'
import type { Icons } from './Icons.jsx'
import type { Octicon } from './Octicon.jsx'
import { ToolCard } from './ToolCard.jsx'

interface Props {
	title: string,
	titleIcon?: keyof typeof Octicon | keyof typeof Icons,
	link?: string,
	children?: ComponentChildren,
}
export function ToolGroup({ title, titleIcon, link, children }: Props) {
	return <div class="tool-group">
		{link === undefined
			? <div class="tool-card"><h3 class="text-[1.17em]">{title}</h3></div>
			: <ToolCard {...{ title, titleIcon, link}} />
		}
		{children && <div class="tool-body">
			{children}
		</div>}
	</div>
}

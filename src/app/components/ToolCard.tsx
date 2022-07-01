import { Icons } from './Icons.js'
import { Octicon } from './Octicon.jsx'

interface Props {
	title: string,
	titleIcon?: keyof typeof Octicon | keyof typeof Icons,
	link: string,
	icon?: keyof typeof Icons,
	desc?: string,
}
export function ToolCard({ title, desc, link, icon, titleIcon }: Props) {
	if (icon || desc) {
		return <a class="tool-card" href={link}>
			{icon && Icons[icon]}
			<div>
				<ToolHead title={title} titleIcon={titleIcon} />
				<p>{desc}</p>
			</div>
		</a>
	}

	return <a class="tool-card" href={link}>
		<ToolHead title={title} titleIcon={titleIcon} />
	</a>
}

function ToolHead({ title, titleIcon }: Pick<Props, 'title' | 'titleIcon'>) {
	return <h3>
		{title}
		{titleIcon && (titleIcon in Octicon ? (Octicon as any)[titleIcon] : (Icons as any)[titleIcon])}
	</h3>
}

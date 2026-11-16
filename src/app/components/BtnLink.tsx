import { Octicon } from './index.js'

interface Props {
	link?: string,
	icon?: keyof typeof Octicon,
	label?: string,
	tooltip?: string,
	tooltipLoc?: 'se' | 'sw' | 'nw',
	tabIndex?: number,
	swapped?: boolean,
}
export function BtnLink({ link, icon, label, tooltip, tooltipLoc, tabIndex, swapped }: Props) {
	return <a {...link ? { href: link } : { disabled: true }} class={`btn btn-link${tooltip ? ` tooltipped tip-${tooltipLoc ?? 'sw'}` : ''}`} aria-label={tooltip} tabIndex={tabIndex}>
		{swapped ? <>
			{label && <span>{label}</span>}
			{icon && Octicon[icon]}
		</> : <>
			{icon && Octicon[icon]}
			{label && <span>{label}</span>}
		</>}
	</a>
}

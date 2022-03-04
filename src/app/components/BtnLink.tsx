import { Octicon } from '.'

interface Props {
	link?: string,
	icon?: keyof typeof Octicon,
	label?: string,
	tooltip?: string,
	tooltipLoc?: 'se' | 'sw' | 'nw',
	swapped?: boolean,
}
export function BtnLink({ link, icon, label, tooltip, tooltipLoc, swapped }: Props) {
	return <a {...link ? { href: link } : { disabled: true }} class={`btn btn-link${tooltip ? ` tooltipped tip-${tooltipLoc ?? 'sw'}` : ''}`} aria-label={tooltip}>
		{swapped ? <>
			{label && <span>{label}</span>}
			{icon && Octicon[icon]}
		</> : <>
			{icon && Octicon[icon]}
			{label && <span>{label}</span>}
		</>}
	</a>
}

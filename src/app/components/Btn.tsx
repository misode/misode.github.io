import { Octicon } from '.'

type BtnProps = {
	icon?: keyof typeof Octicon,
	label?: string,
	active?: boolean,
	tooltip?: string,
	tooltipLoc?: 'se' | 'sw' | 'nw',
	showTooltip?: boolean,
	class?: string,
	onClick?: (event: MouseEvent) => unknown,
}
export function Btn({ icon, label, active, class: clazz, tooltip, tooltipLoc, onClick }: BtnProps) {
	return <div class={`btn${active ? ' active' : ''}${clazz ? ` ${clazz}` : ''}${tooltip ? ` tooltipped tip-${tooltipLoc ?? 'sw'}` : ''}${active ? ' tip-shown' : ''}`} onClick={onClick} aria-label={tooltip}>
		{icon && Octicon[icon]}
		{label && <span>{label}</span>}
	</div>
}

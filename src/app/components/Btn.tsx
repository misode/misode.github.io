import { Octicon } from '.'

type BtnProps = {
	icon?: keyof typeof Octicon,
	label?: string,
	active?: boolean,
	class?: string,
	onClick?: (event: MouseEvent) => unknown,
}
export function Btn({ icon, label, active, class: class_, onClick }: BtnProps) {
	return <div class={`btn${active ? ' active' : ''}${class_ ? ` ${class_}` : ''}`} onClick={onClick}>
		{icon && Octicon[icon]}
		{label && <span>{label}</span>}
	</div>
}

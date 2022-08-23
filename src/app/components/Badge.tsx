import { hashString } from '../Utils.js'
import { Octicon } from './index.js'

interface Props {
	label: string,
	active?: boolean,
	onClick?: (e: MouseEvent) => unknown,
}
export function Badge({ label, active, onClick }: Props) {
	const color = label === 'breaking' ? 5 : hashString(label) % 360
	return <div class={`badge${active ? ' active' : ''}${onClick ? ' clickable' : ''}`} style={`--tint: ${color}`} onClick={onClick}>
		{label === 'breaking' && Octicon.alert}
		{label}
	</div>
}

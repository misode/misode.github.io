import { hashString } from '../../Utils.js'
import { Octicon } from '../index.js'

type TagProps = {
	label: string,
	active?: boolean,
	onClick?: (e: MouseEvent) => unknown,
}
export function ChangelogTag({ label, active, onClick }: TagProps) {
	const color = label === 'breaking' ? 5 : hashString(label) % 360
	return <div class={`changelog-tag${active ? ' active' : ''}${onClick ? ' clickable' : ''}`} style={`--tint: ${color}`} onClick={onClick}>
		{label === 'breaking' && Octicon.alert}
		{label}
	</div>
}

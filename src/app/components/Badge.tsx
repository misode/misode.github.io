import { hashString } from '../Utils.js'
import { useLocale } from '../contexts/Locale.jsx'
import { Octicon } from './index.js'

interface Props {
	label: string,
	active?: boolean,
	onClick?: (e: MouseEvent) => unknown,
}
export function Badge({ label, active, onClick }: Props) {
	const { locale } = useLocale()
	const color = {
		breaking: 5,
		obsolete: 340,
	}[label] ?? (hashString(label) % 360)
	return <div class={`badge${active ? ' active' : ''}${onClick ? ' clickable' : ''}${label === 'obsolete' ? ' tooltipped tip-se' : ''}`} style={`--tint: ${color}`} onClick={onClick} aria-label={{ obsolete: locale('change.obsolete') }[label]}>
		{label === 'breaking' && Octicon.alert}
		{label === 'obsolete' && Octicon.circle_slash}
		{label}
	</div>
}

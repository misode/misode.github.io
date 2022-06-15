import { hexId } from '../../Utils.js'

interface Props {
	label: string,
	value: boolean,
	onChange: (value: boolean) => unknown,
}
export function Checkbox({ label, value, onChange }: Props) {
	const id = hexId()
	return <label class="checkbox">
		<input id={id} type="checkbox" checked={value} onClick={() => onChange(!value)} />
		{label}
	</label>
}

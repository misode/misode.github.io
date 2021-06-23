import { Octicon } from '.'

type BtnInputProps = {
	icon?: keyof typeof Octicon,
	label?: string,
	large?: boolean,
	type?: 'number' | 'text',
	value?: string,
	onChange?: (value: string) => unknown,
}
export function BtnInput({ icon, label, large, type, value, onChange }: BtnInputProps) {
	const onKeyUp = onChange === undefined ? () => {} : (e: any) => {
		const value = (e.target as HTMLInputElement).value
		if (type !== 'number' || (!value.endsWith('.') && !isNaN(Number(value)))) {
			onChange?.(value)
		}
	}
	return <div class={`btn btn-input ${large ? 'large-input' : ''}`} onClick={e => e.stopPropagation()}>
		{icon && Octicon[icon]}
		{label && <span>{label}</span>}
		<input type="text" value={value} onKeyUp={onKeyUp} />
	</div>
}

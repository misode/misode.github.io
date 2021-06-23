import { useEffect, useRef } from 'preact/hooks'
import { Octicon } from '.'

type BtnInputProps = {
	icon?: keyof typeof Octicon,
	label?: string,
	large?: boolean,
	type?: 'number' | 'text',
	doSelect?: number,
	value?: string,
	onChange?: (value: string) => unknown,
}
export function BtnInput({ icon, label, large, type, doSelect, value, onChange }: BtnInputProps) {
	const onKeyUp = onChange === undefined ? () => {} : (e: any) => {
		const value = (e.target as HTMLInputElement).value
		if (type !== 'number' || (!value.endsWith('.') && !isNaN(Number(value)))) {
			onChange?.(value)
		}
	}

	const ref = useRef<HTMLInputElement>(null)
	useEffect(() => {
		if (doSelect && ref.current) {
			ref.current.select()
		}
	}, [doSelect])

	return <div class={`btn btn-input ${large ? 'large-input' : ''}`} onClick={e => e.stopPropagation()}>
		{icon && Octicon[icon]}
		{label && <span>{label}</span>}
		<input ref={ref} type="text" value={value} onKeyUp={onKeyUp} />
	</div>
}

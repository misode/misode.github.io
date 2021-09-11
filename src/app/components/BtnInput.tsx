import { useEffect, useRef } from 'preact/hooks'
import { Octicon } from '.'

type BtnInputProps = {
	icon?: keyof typeof Octicon,
	label?: string,
	large?: boolean,
	doSelect?: number,
	value?: string,
	onChange?: (value: string) => unknown,
}
export function BtnInput({ icon, label, large, doSelect, value, onChange }: BtnInputProps) {
	const onInput = onChange === undefined ? () => {} : (e: any) => {
		const value = (e.target as HTMLInputElement).value
		onChange?.(value)
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
		<input ref={ref} type="text" value={value} onChange={onInput} />
	</div>
}

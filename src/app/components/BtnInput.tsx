import { useEffect, useRef } from 'preact/hooks'
import { Octicon } from '.'
import { hexId } from '../Utils'

type BtnInputProps = {
	icon?: keyof typeof Octicon,
	label?: string,
	large?: boolean,
	larger?: boolean,
	doSelect?: number,
	value?: string,
	placeholder?: string,
	dataList?: string[],
	onChange?: (value: string) => unknown,
}
export function BtnInput({ icon, label, large, larger, doSelect, value, placeholder, dataList, onChange }: BtnInputProps) {
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

	const dataListId = dataList && hexId()

	return <div class={`btn btn-input ${large ? 'large-input' : ''} ${larger ? 'larger-input' : ''}`} onClick={e => e.stopPropagation()}>
		{icon && Octicon[icon]}
		{label && <span>{label}</span>}
		<input ref={ref} type="text" value={value} onChange={onInput} placeholder={placeholder} list={dataListId} />
		{dataList && <datalist id={dataListId}>
			{dataList.map(e => <option value={e} />)}
		</datalist>}
	</div>
}

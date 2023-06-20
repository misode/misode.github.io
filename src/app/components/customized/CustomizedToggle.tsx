import type { ComponentChildren } from 'preact'
import { CustomizedInput } from './CustomizedInput.jsx'

interface Props {
	label: string,
	help?: string,
	value: boolean,
	initial?: boolean,
	onChange: (value: boolean) => void,
	children?: ComponentChildren,
}
export function CustomizedToggle(props: Props) {
	return <CustomizedInput {...props} trailing={props.children}>
		<button class={`customized-toggle${!props.value ? ' customized-false' : ''}`} onClick={() => props.onChange(false)}>No</button>
		<span>/</span>
		<button class={`customized-toggle${props.value ? ' customized-true' : ''}`} onClick={() => props.onChange(true)}>Yes</button>
	</CustomizedInput>
}

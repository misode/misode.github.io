import type { NodeChildren } from '@mcschema/core'
import { NumberInput, RangeInput } from '../index.js'
import { CustomizedInput } from './CustomizedInput.jsx'

interface Props {
	label: string,
	help?: string,
	value: number,
	min: number,
	max: number,
	step?: number,
	initial?: number,
	error?: string,
	onChange: (value: number) => void,
	children?: NodeChildren,
}
export function CustomizedSlider(props: Props) {
	const isInteger = (props.step ?? 1) >= 1
	return <CustomizedInput {...props}>
		<RangeInput value={props.value} min={props.min} max={props.max} step={props.step ?? 1} onChange={props.onChange} />
		<NumberInput value={isInteger ? props.value : props.value.toFixed(3)} step={Math.max(1, props.step ?? 1)} onChange={props.onChange} />
	</CustomizedInput>
}

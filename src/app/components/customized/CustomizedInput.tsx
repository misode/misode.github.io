import type { ComponentChildren } from 'preact'
import { deepClone, deepEqual } from '../../Utils.js'
import { Octicon } from '../index.js'

interface Props<T> {
	label: ComponentChildren,
	help?: string,
	value: T,
	initial?: T,
	onChange: (value: T) => void,
	error?: string,
	children?: ComponentChildren,
	trailing?: ComponentChildren,
}
export function CustomizedInput<T>({ label, help, value, initial, onChange, error, children, trailing }: Props<T>) {
	const isModified = initial !== undefined && !deepEqual(value, initial)
	return <div class={`customized-input${error !== undefined ? ' customized-errored' : ''}`}>
		<span class="customized-label">
			{typeof label === 'string' ? <label>{label}</label> : label}
			{isModified && <span class="customized-modified">*</span>}
			{help !== undefined && <span class="customized-help tooltipped tip-se" aria-label={help}>{Octicon.question}</span>}
		</span>
		{children}
		{(isModified && initial != undefined) && <button class="customized-icon tooltipped tip-se" aria-label="Reset to default" onClick={() => onChange(deepClone(initial))}>{Octicon.undo}</button>}
		{error !== undefined && <button class="customized-icon customized-error tooltipped tip-se" aria-label={error}>{Octicon.issue_opened}</button>}
		{trailing}
	</div>
}

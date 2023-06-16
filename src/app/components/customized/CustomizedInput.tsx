import type { ComponentChildren } from 'preact'
import { deepClone, deepEqual } from '../../Utils.js'
import { Octicon } from '../index.js'

interface Props<T> {
	label: ComponentChildren,
	value: T,
	initial?: T,
	onChange: (value: T) => void,
	error?: string,
	children?: ComponentChildren,
	trailing?: ComponentChildren,
}
export function CustomizedInput<T>({ label, value, initial, onChange, error, children, trailing }: Props<T>) {
	const isModified = initial !== undefined && !deepEqual(value, initial)
	return <div class={`customized-input${isModified ? ' customized-modified' : ''}${error !== undefined ? ' customized-errored' : ''}`}>
		<span class="customized-label">
			{typeof label === 'string' ? <label>{label}</label> : label}
		</span>
		{children}
		{(isModified && initial != undefined) && <button class="customized-icon tooltipped tip-se" aria-label="Reset to default" onClick={() => onChange(deepClone(initial))}>{Octicon.undo}</button>}
		{error !== undefined && <button class="customized-icon customized-error tooltipped tip-se" aria-label={error}>{Octicon.issue_opened}</button>}
		{trailing}
	</div>
}

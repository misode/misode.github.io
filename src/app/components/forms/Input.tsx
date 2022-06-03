import { useEffect, useRef } from 'preact/hooks'
import type { JSXInternal } from 'preact/src/jsx'

type InputProps = JSXInternal.HTMLAttributes<HTMLInputElement>

type BaseInputProps<T> = Omit<InputProps, 'onChange' | 'type'> & {
	onChange?: (value: T) => unknown,
	onEnter?: (value: T) => unknown,
	onCancel?: () => unknown,
}
function BaseInput<T>(name: string, type: string, fn: (value: string) => T) {
	const component = (props: BaseInputProps<T>) => {
		const onChange = props.onChange && ((evt: Event) => {
			const value = (evt.target as HTMLInputElement).value
			props.onChange?.(fn(value))
		})
		const onKeyDown = props.onEnter && ((evt: KeyboardEvent) => {
			if (evt.key === 'Enter') {
				const value = (evt.target as HTMLInputElement).value
				props.onEnter?.(fn(value))
			} else if (evt.key === 'Escape') {
				props.onCancel?.()
			}
		})
		const ref = useRef<HTMLInputElement>(null)
		useEffect(() => {
			if (props.autofocus) {
				ref.current?.select()
			}
		}, [props.autofocus])
		return <input ref={ref} {...props} {...{ type, onChange, onKeyDown }} />
	}
	component.displayName = name
	return component
}

export const TextInput = BaseInput('TextInput', 'text', v => v)

export const NumberInput = BaseInput('NumberInput', 'number', v => Number(v))

export const RangeInput = BaseInput('RangeInput', 'range', v => Number(v))

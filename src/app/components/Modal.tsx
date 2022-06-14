import { useCallback, useEffect } from 'preact/hooks'
import type { JSXInternal } from 'preact/src/jsx'
import { LOSE_FOCUS } from '../hooks'

const MODALS_KEY = 'data-modals'

interface Props extends JSXInternal.HTMLAttributes<HTMLDivElement> {
	onDismiss: () => void,
}
export function Modal(props: Props) {
	useEffect(() => {
		addCurrentModals(1)
		window.addEventListener('click', props.onDismiss)
		return () => {
			addCurrentModals(-1)
			window.removeEventListener('click', props.onDismiss)
		}
	})

	const onClick = useCallback((e: MouseEvent) => {
		e.stopPropagation()
		e.target?.dispatchEvent(new Event(LOSE_FOCUS, { bubbles: true }))
	}, [])

	return <div {...props} class={`modal ${props.class ?? ''}`} onClick={onClick}>
		{props.children}
	</div>
}

function addCurrentModals(diff: number) {
	const currentModals = parseInt(document.body.getAttribute(MODALS_KEY) ?? '0')
	const newModals = currentModals + diff
	if (newModals <= 0) {
		document.body.removeAttribute(MODALS_KEY)
	} else {
		document.body.setAttribute(MODALS_KEY, newModals.toFixed())
	}
}

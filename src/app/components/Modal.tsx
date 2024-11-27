import type { JSX } from 'preact'
import { useCallback, useEffect } from 'preact/hooks'
import { useModal } from '../contexts/Modal.jsx'
import { LOSE_FOCUS } from '../hooks/index.js'

const MODALS_KEY = 'data-modals'

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {}
export function Modal(props: Props) {
	const { hideModal } = useModal()

	useEffect(() => {
		addCurrentModals(1)
		window.addEventListener('click', hideModal)
		return () => {
			addCurrentModals(-1)
			window.removeEventListener('click', hideModal)
		}
	}, [hideModal])

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

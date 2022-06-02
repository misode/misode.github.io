import { useEffect } from 'preact/hooks'

const MODALS_KEY = 'data-modals'

export function useModal(onDismiss: () => void) {

	useEffect(() => {
		addCurrentModals(1)
		window.addEventListener('click', onDismiss)
		return () => {
			addCurrentModals(-1)
			window.removeEventListener('click', onDismiss)
		}
	})
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

import type { ComponentChildren, FunctionComponent } from 'preact'
import { createContext } from 'preact'
import { useCallback, useContext, useState } from 'preact/hooks'

interface ModalContext {
	showModal: (component: FunctionComponent) => void
	hideModal: () => void
}

const ModalContext = createContext<ModalContext | undefined>(undefined)

export function useModal() {
	const context = useContext(ModalContext)
	if (context === undefined) {
		throw new Error('Cannot use modal context')
	}
	return context
}

export function ModalProvider({ children }: { children: ComponentChildren }) {
	const [modal, setModal] = useState<FunctionComponent>()

	const showModal = useCallback((component: FunctionComponent) => {
		setModal(component)
	}, [])

	const hideModal = useCallback(() => {
		setModal(undefined)
	}, [])

	const value: ModalContext = {
		showModal,
		hideModal,
	}

	return <ModalContext.Provider value={value}>
		{children}
		{modal !== undefined && modal}
	</ModalContext.Provider>
}

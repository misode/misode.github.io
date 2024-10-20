import type { DocAndNode } from '@spyglassmc/core'
import type { ComponentChildren } from 'preact'
import { createContext } from 'preact'
import type { Inputs } from 'preact/hooks'
import { useContext, useEffect, useState } from 'preact/hooks'
import { Spyglass } from '../services/Spyglass.js'

interface SpyglassContext {
	spyglass: Spyglass,
}

const SpyglassContext = createContext<SpyglassContext | undefined>(undefined)

export function useSpyglass(): SpyglassContext {
	const ctx = useContext(SpyglassContext)
	if (ctx === undefined) {
		throw new Error('Cannot use Spyglass context')
	}
	return ctx
}

export function watchSpyglassUri(
	uri: string | undefined,
	handler: (docAndNode: DocAndNode) => void,
	inputs: Inputs = [],
) {
	const { spyglass } = useSpyglass()

	useEffect(() => {
		if (!uri || !spyglass) {
			return
		}
		spyglass.watchFile(uri, handler)
		return () => spyglass.unwatchFile(uri, handler)
	}, [spyglass, uri, handler, ...inputs])
}

export function useDocAndNode(original: DocAndNode, inputs?: Inputs): DocAndNode
export function useDocAndNode(original: DocAndNode | undefined, inputs?: Inputs): DocAndNode | undefined
export function useDocAndNode(original: DocAndNode | undefined, inputs: Inputs = []) {
	const [wrapped, setWrapped] = useState(original)

	useEffect(() => {
		setWrapped(original)
	}, [original, setWrapped, ...inputs])

	watchSpyglassUri(original?.doc.uri, updated => {
		setWrapped(updated)
	}, [original?.doc.uri, setWrapped, ...inputs])

	return wrapped
}

export function SpyglassProvider({ children }: { children: ComponentChildren }) {
	const [spyglass] = useState(new Spyglass())

	const value: SpyglassContext = {
		spyglass,
	}

	return <SpyglassContext.Provider value={value}>
		{children}
	</SpyglassContext.Provider>
}

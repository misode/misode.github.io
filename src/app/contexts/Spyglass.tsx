import type { DocAndNode } from '@spyglassmc/core'
import type { ComponentChildren } from 'preact'
import { createContext } from 'preact'
import type { Inputs } from 'preact/hooks'
import { useContext, useEffect, useState } from 'preact/hooks'
import { useAsync } from '../hooks/useAsync.js'
import { Spyglass } from '../services/Spyglass.js'
import { useVersion } from './Version.jsx'

interface SpyglassContext {
	spyglass?: Spyglass,
	spyglassLoading: boolean,
}

const SpyglassContext = createContext<SpyglassContext | undefined>(undefined)

export function useSpyglass(): SpyglassContext {
	return useContext(SpyglassContext) ?? { spyglassLoading: true }
}

export function watchSpyglassUri(
	uri: string | undefined,
	handler: (docAndNode: DocAndNode) => void,
	inputs: Inputs = [],
) {
	const { spyglass, spyglassLoading } = useSpyglass()

	useEffect(() => {
		if (!uri || !spyglass || spyglassLoading) {
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
	const { version } = useVersion()

	const { value: spyglass, loading: spyglassLoading } = useAsync(() => {
		return Spyglass.initialize(version)
	}, [version])

	const value: SpyglassContext = {
		spyglass,
		spyglassLoading,
	}

	return <SpyglassContext.Provider value={value}>
		{children}
	</SpyglassContext.Provider>
}

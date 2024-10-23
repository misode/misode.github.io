import type { DocAndNode } from '@spyglassmc/core'
import type { ComponentChildren } from 'preact'
import { createContext } from 'preact'
import type { Inputs } from 'preact/hooks'
import { useContext, useEffect, useState } from 'preact/hooks'
import { useAsync } from '../hooks/useAsync.js'
import type { SpyglassService } from '../services/Spyglass.js'
import { SpyglassClient } from '../services/Spyglass.js'
import { useVersion } from './Version.jsx'

interface SpyglassContext {
	client: SpyglassClient
	service: SpyglassService | undefined
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
	const { service } = useSpyglass()

	useEffect(() => {
		if (!uri || !service) {
			return
		}
		service.watchFile(uri, handler)
		return () => service.unwatchFile(uri, handler)
	}, [service, uri, handler, ...inputs])
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
	const [client] = useState(new SpyglassClient())

	const { value: service } = useAsync(() => {
		return client.createService(version)
	}, [client, version])

	const value: SpyglassContext = {
		client,
		service,
	}

	return <SpyglassContext.Provider value={value}>
		{children}
	</SpyglassContext.Provider>
}

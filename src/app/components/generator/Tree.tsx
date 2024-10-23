import type { DocAndNode } from '@spyglassmc/core'
import { JsonFileNode } from '@spyglassmc/json'
import { useCallback, useErrorBoundary, useMemo } from 'preact/hooks'
import { useLocale } from '../../contexts/index.js'
import { useDocAndNode, useSpyglass } from '../../contexts/Spyglass.jsx'
import type { AstEdit } from '../../services/Spyglass.js'
import type { McdocContext } from './McdocRenderer.jsx'
import { McdocRoot } from './McdocRenderer.jsx'

type TreePanelProps = {
	docAndNode: DocAndNode,
	onError: (message: string) => unknown,
}
export function Tree({ docAndNode, onError }: TreePanelProps) {
	const { lang } = useLocale()
	const { service } = useSpyglass()

	if (lang === 'none') return <></>

	const fileChild = useDocAndNode(docAndNode).node.children[0]
	if (!JsonFileNode.is(fileChild)) {
		return <></>
	}

	const [error] = useErrorBoundary(e => {
		onError(`Error rendering the tree: ${e.message}`)
		console.error(e)
	})
	if (error) return <></>

	const makeEdit = useCallback((edit: AstEdit) => {
		if (!service) {
			return
		}
		service.applyEdit(docAndNode.doc.uri, edit)
	}, [service, docAndNode])

	const ctx = useMemo<McdocContext | undefined>(() => {
		if (!service) {
			return undefined
		}
		return { doc: docAndNode.doc, symbols: service.getSymbols() }
	}, [docAndNode, service])

	return <div class="tree node-root" data-cy="tree">
		{ctx && <McdocRoot node={fileChild.children[0]} makeEdit={makeEdit} ctx={ctx} />}
	</div>
}

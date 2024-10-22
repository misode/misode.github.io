import type { DocAndNode } from '@spyglassmc/core'
import { JsonFileNode } from '@spyglassmc/json'
import { useCallback, useErrorBoundary } from 'preact/hooks'
import { useLocale, useVersion } from '../../contexts/index.js'
import { useDocAndNode, useSpyglass } from '../../contexts/Spyglass.jsx'
import type { Edit } from '../../services/Spyglass.js'
import { McdocRoot } from './McdocRenderer.jsx'

type TreePanelProps = {
	docAndNode: DocAndNode,
	onError: (message: string) => unknown,
}
export function Tree({ docAndNode, onError }: TreePanelProps) {
	const { lang } = useLocale()
	const { version } = useVersion()
	const { spyglass } = useSpyglass()

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

	const makeEdits = useCallback((edits: Edit[]) => {
		spyglass.applyEdits(version, docAndNode.doc.uri, edits)
	}, [spyglass, version, docAndNode])

	return <div class="tree node-root" data-cy="tree">
		<McdocRoot node={fileChild.children[0]} makeEdits={makeEdits} />
	</div>
}

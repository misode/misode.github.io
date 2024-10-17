import type { DocAndNode } from '@spyglassmc/core'
import { JsonFileNode } from '@spyglassmc/json'
import { useErrorBoundary } from 'preact/hooks'
import { useLocale } from '../../contexts/index.js'
import { useDocAndNode } from '../../contexts/Spyglass.jsx'
import { McdocRoot } from './McdocRenderer.jsx'

type TreePanelProps = {
	docAndNode: DocAndNode,
	onError: (message: string) => unknown,
}
export function Tree({ docAndNode, onError }: TreePanelProps) {
	const { lang } = useLocale()
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

	return <div class="tree node-root" data-cy="tree">
		<McdocRoot node={fileChild.children[0]} />
	</div>
}

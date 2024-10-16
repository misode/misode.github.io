import type { DocAndNode } from '@spyglassmc/core'
import { useErrorBoundary } from 'preact/hooks'
import { useLocale } from '../../contexts/index.js'

type TreePanelProps = {
	docAndNode: DocAndNode,
	onError: (message: string) => unknown,
}
export function Tree({ onError }: TreePanelProps) {
	const { lang } = useLocale()
	if (lang === 'none') return <></>

	const [error] = useErrorBoundary(e => {
		onError(`Error rendering the tree: ${e.message}`)
		console.error(e)
	})
	if (error) return <></>

	return <div class="tree" data-cy="tree">
		{/* TODO: render tree */}
	</div>
}

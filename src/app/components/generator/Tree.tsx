import { useErrorBoundary } from 'preact/hooks'
import { useLocale } from '../../contexts/index.js'
import type { FileModel } from '../../services/index.js'

type TreePanelProps = {
	model: FileModel | undefined,
	onError: (message: string) => unknown,
}
export function Tree({ model, onError }: TreePanelProps) {
	const { lang } = useLocale()
	if (!model || lang === 'none') return <></>

	const [error] = useErrorBoundary(e => {
		onError(`Error rendering the tree: ${e.message}`)
		console.error(e)
	})
	if (error) return <></>

	return <div class="tree" data-cy="tree">
		{/* TODO: render tree */}
	</div>
}

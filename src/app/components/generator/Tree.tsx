import type { DataModel } from '@mcschema/core'
import { useErrorBoundary, useState } from 'preact/hooks'
import { useLocale } from '../../contexts/index.js'
import { useModel } from '../../hooks/index.js'
import { FullNode } from '../../schema/renderHtml.js'
import type { BlockStateRegistry, VersionId } from '../../services/index.js'

type TreePanelProps = {
	version: VersionId,
	model: DataModel | undefined,
	blockStates: BlockStateRegistry | undefined,
	onError: (message: string) => unknown,
}
export function Tree({ version, model, blockStates, onError }: TreePanelProps) {
	const { lang } = useLocale()
	if (!model || !blockStates || lang === 'none') return <></>

	const [error] = useErrorBoundary(e => {
		onError(`Error rendering the tree: ${e.message}`)
		console.error(e)
	})
	if (error) return <></>

	const [, setState] = useState(0)
	useModel(model, () => {
		setState(state => state + 1)
	})

	return <div class="tree" data-cy="tree">
		<FullNode {...{model, lang, version, blockStates}}/>
	</div>
}

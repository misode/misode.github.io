import type { DataModel } from '@mcschema/core'
import { useErrorBoundary, useState } from 'preact/hooks'
import { useModel } from '../hooks'
import { FullNode } from '../schema/renderHtml'
import type { BlockStateRegistry, VersionId } from '../Schemas'

type TreePanelProps = {
	lang: string,
	version: VersionId,
	model: DataModel | null,
	blockStates: BlockStateRegistry | null,
	onError: (message: string) => unknown,
}
export function Tree({ lang, model, blockStates, onError }: TreePanelProps) {
	if (!model || !blockStates) return <></>

	const [error] = useErrorBoundary(e => {
		onError(`Error rendering the tree: ${e.message}`)
		console.error(e)
	})
	if (error) return <></>

	const [, setState] = useState(0)
	useModel(model, () => {
		setState(state => state + 1)
	})

	return <div class="tree">
		<FullNode {...{model, lang, blockStates}}/>
	</div>
}

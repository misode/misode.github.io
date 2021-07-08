import type { DataModel } from '@mcschema/core'
import { ModelPath } from '@mcschema/core'
import { useErrorBoundary, useState } from 'preact/hooks'
import { useModel } from '../hooks'
import { locale } from '../Locales'
import { renderHtml } from '../schema/renderHtml'
import type { BlockStateRegistry, VersionId } from '../Schemas'

type TreePanelProps = {
	lang: string,
	version: VersionId,
	model: DataModel | null,
	blockStates: BlockStateRegistry | null,
	onError: (message: string) => unknown,
}
export function Tree({ lang, model, version, blockStates, onError }: TreePanelProps) {
	if (!model || !blockStates) return <></>

	useErrorBoundary(e => {
		onError(`Error rendering the tree: ${e.message}`)
		console.error(e)
	})

	const [, setState] = useState(0)
	useModel(model, () => {
		setState(state => state + 1)
	})

	const props = { loc: locale.bind(null, lang), version, blockStates }
	const path = new ModelPath(model)
	const [prefix, suffix, body] = model.schema.hook(renderHtml, path, model.data, props)

	return <div class="tree">
		{suffix ? <div class={`node ${model.schema.type(path)}-node`} data-category={model.schema.category(path)}>
			<div class="node-header">{prefix}{suffix}</div>
			<div class="node-body">{body}</div>
		</div> : body}
	</div>
}

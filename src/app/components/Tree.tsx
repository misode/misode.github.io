import type { DataModel } from '@mcschema/core'
import { ModelPath } from '@mcschema/core'
import type { JSX } from 'preact'
import { useErrorBoundary, useMemo, useRef, useState } from 'preact/hooks'
import rfdc from 'rfdc'
import { useModel } from '../hooks'
import { renderHtml } from '../schema/renderHtml'
import type { BlockStateRegistry, VersionId } from '../Schemas'
const clone = rfdc()

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

	const [state, setState] = useState(0)
	useModel(model, () => {
		setState(state => state + 1)
	})

	const path = new ModelPath(model)
	const tree = useRef<JSX.Element | null>(null)
	useMemo(() => {
		const [prefix, suffix, body] = model.schema.hook(renderHtml, path, clone(model.data), lang, blockStates)
		tree.current = suffix?.props?.children.some((c: any) => c) ? <div class={`node ${model.schema.type(path)}-node`} data-category={model.schema.category(path)}>
			<div class="node-header">{prefix}{suffix}</div>
			<div class="node-body">{body}</div>
		</div> : body
	}, [lang, model, blockStates, state])

	return <div class="tree">{tree.current}</div>
}

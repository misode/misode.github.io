import type { DataModel } from '@mcschema/core'
import { ModelPath } from '@mcschema/core'
import { useEffect, useRef } from 'preact/hooks'
import { useModel } from '../hooks'
import { locale } from '../Locales'
import { Mounter } from '../schema/Mounter'
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
	const tree = useRef<HTMLDivElement>(null)
	const redraw = useRef<Function>()

	useEffect(() => {
		redraw.current = () => {
			if (!model || !blockStates) return
			try {
				const mounter = new Mounter()
				const props = { loc: locale.bind(null, lang), version, mounter, blockStates }
				const path = new ModelPath(model)
				const rendered = model.schema.hook(renderHtml, path, model.data, props)
				const category = model.schema.category(path)
				const type = model.schema.type(path)
				let html = rendered[2]
				if (rendered[1]) {
					html = `<div class="node ${type}-node" ${category ? `data-category="${category}"` : ''}>
						<div class="node-header">${rendered[0]}${rendered[1]}</div>
						<div class="node-body">${rendered[2]}</div>
					</div>`
				}
				tree.current.innerHTML = html
				mounter.mounted(tree.current)
			} catch (e) {
				onError(`Error rendering the tree: ${e.message}`)
				console.error(e)
				tree.current.innerHTML = ''
			}
		}
	})

	useModel(model, () => {
		redraw.current()
	})

	useEffect(() => {
		redraw.current()
	}, [lang, model, blockStates])

	return <div ref={tree} class="tree"></div>
}

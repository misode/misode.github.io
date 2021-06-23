import type { DataModel } from '@mcschema/core'
import { ModelPath } from '@mcschema/core'
import { useEffect, useRef } from 'preact/hooks'
import { useModel } from '../hooks'
import { locale } from '../Locales'
import { Mounter } from '../schema/Mounter'
import { renderHtml } from '../schema/renderHtml'
import type { VersionId } from '../Schemas'

type TreePanelProps = {
	lang: string,
	model: DataModel | null,
	version: VersionId,
}
export function Tree({ lang, model, version }: TreePanelProps) {
	const tree = useRef<HTMLDivElement>(null)
	const redraw = useRef<Function>()

	useEffect(() => {
		redraw.current = () => {
			if (!model) return
			const mounter = new Mounter()
			const props = { loc: locale.bind(null, lang), version, mounter }
			const path = new ModelPath(model)
			const rendered = model.schema.hook(renderHtml, path, model.data, props)
			const category = model.schema.category(path)
			const type = model.schema.type(path)
			let html = rendered[2]
			if (rendered[1]) {
				html = `<div class="node ${type}-node" ${category ? `data-category="${category}"` : ''}>
					<div class="node-header">${rendered[1]}</div>
					<div class="node-body">${rendered[2]}</div>
				</div>`
			}
			tree.current.innerHTML = html
			mounter.mounted(tree.current)
		}
	})

	useModel(model, () => {
		redraw.current()
	})

	useEffect(() => {
		redraw.current()
	}, [lang])

	return <div ref={tree} class="tree"></div>
}

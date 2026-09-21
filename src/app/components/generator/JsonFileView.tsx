import type { DocAndNode, Range } from '@spyglassmc/core'
import { dissectUri } from '@spyglassmc/java-edition/lib/binder/index.js'
import type { JsonNode } from '@spyglassmc/json'
import { JsonFileNode } from '@spyglassmc/json'
import { useCallback, useMemo } from 'preact/hooks'
import { useSpyglass } from '../../contexts/Spyglass.jsx'
import { getRootType, simplifyType } from './McdocHelpers.js'
import type { McdocContext } from './McdocRenderer.jsx'
import { McdocRoot } from './McdocRenderer.jsx'

type JsonFileViewProps = {
	docAndNode: DocAndNode,
	node: JsonNode,
}
export function JsonFileView({ docAndNode, node }: JsonFileViewProps) {
	const { service } = useSpyglass()

	const makeEdit = useCallback((edit: (range: Range) => JsonNode | undefined) => {
		if (!service) {
			return
		}
		service.applyEdit(docAndNode.doc.uri, (fileNode) => {
			const jsonFile = fileNode.children[0]
			if (JsonFileNode.is(jsonFile)) {
				const original = jsonFile.children[0]
				const newNode = edit(original.range)
				if (newNode !== undefined) {
					newNode.parent = fileNode
					fileNode.children[0] = newNode
				}
			}
		})
	}, [service, docAndNode])

	const ctx = useMemo<McdocContext | undefined>(() => {
		if (!service) {
			return undefined
		}
		const errors = [
			...docAndNode.node.binderErrors ?? [],
			...docAndNode.node.checkerErrors ?? [],
			...docAndNode.node.linterErrors ?? [],
		]
		const checkerCtx = service.getCheckerContext(docAndNode.doc, errors)
		return { ...checkerCtx, makeEdit }
	}, [docAndNode, service, makeEdit])

	const resourceType = useMemo(() => {
		if (docAndNode.doc.uri.endsWith('/pack.mcmeta')) {
			return 'pack_mcmeta'
		}
		if (ctx === undefined) {
			return undefined
		}
		const res = dissectUri(docAndNode.doc.uri, ctx)
		return res?.category
	}, [docAndNode, ctx])

	const mcdocType = useMemo(() => {
		if (!ctx || !resourceType) {
			return undefined
		}
		const rootType = getRootType(resourceType)
		const type = simplifyType(rootType, ctx)
		return {type, rootType}
	}, [resourceType, ctx])

	return <div class="file-view node-root" data-category={getCategory(resourceType)}>
		{(ctx && mcdocType) && <McdocRoot type={mcdocType.type} node={node} ctx={ctx} rootType={mcdocType.rootType} />}
	</div>
}

function getCategory(type: string | undefined) {
	switch (type) {
		case 'item_modifier': return 'function'
		case 'predicate': return 'predicate'
		default: return undefined
	}
}

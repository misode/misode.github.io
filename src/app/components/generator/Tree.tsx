import type { DocAndNode, Range } from '@spyglassmc/core'
import type { JsonNode } from '@spyglassmc/json'
import { JsonFileNode } from '@spyglassmc/json'
import type { AttributeValue, McdocType } from '@spyglassmc/mcdoc'
import { useCallback, useErrorBoundary, useMemo } from 'preact/hooks'
import { disectFilePath, useLocale, useVersion } from '../../contexts/index.js'
import { useDocAndNode, useSpyglass } from '../../contexts/Spyglass.jsx'
import { simplifyType } from './McdocHelpers.js'
import type { McdocContext } from './McdocRenderer.jsx'
import { McdocRoot } from './McdocRenderer.jsx'

type TreePanelProps = {
	docAndNode: DocAndNode,
	onError: (message: string) => unknown,
}
export function Tree({ docAndNode: original, onError }: TreePanelProps) {
	const { lang } = useLocale()
	const { version } = useVersion()
	const { service } = useSpyglass()

	if (lang === 'none') return <></>

	const docAndNode = useDocAndNode(original)
	const fileChild = docAndNode.node.children[0]
	if (!JsonFileNode.is(fileChild)) {
		return <></>
	}

	const [error] = useErrorBoundary(e => {
		onError(`Error rendering the tree: ${e.message}`)
		console.error(e)
	})
	if (error) return <></>

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
		return service.getCheckerContext(docAndNode.doc, errors)
	}, [docAndNode, service])

	const resourceType = useMemo(() => {
		const path = original.doc.uri
			.replace(/^file:\/\/\/project\//, '')
			.replace(/\.json$/, '')
		const res = disectFilePath(path, version)
		return res?.type
	}, [original, version])

	const mcdocType = useMemo(() => {
		if (!ctx || !resourceType) {
			return undefined
		}
		return simplifyType(getRootType(resourceType), ctx)
	}, [resourceType, ctx])

	return <div class="tree node-root" data-cy="tree" data-category={getCategory(resourceType)}>
		{(ctx && mcdocType) && <McdocRoot type={mcdocType} node={fileChild.children[0]} makeEdit={makeEdit} ctx={ctx} />}
	</div>
}

function getRootType(id: string): McdocType {
	if (id === 'pack_mcmeta') {
		return { kind: 'reference', path: '::java::pack::Pack' }
	}
	if (id === 'text_component' ) {
		return { kind: 'reference', path: '::java::server::util::text::Text' }
	}
	if (id.startsWith('tag/')) {
		const attribute: AttributeValue = {
			kind: 'tree',
			values: {
				registry: { kind: 'literal', value: { kind: 'string', value: id.slice(4) } },
				tags: { kind: 'literal', value: { kind: 'string', value: 'allowed' } },
			},
		}
		return {
			kind: 'concrete',
			child: { kind: 'reference', path: '::java::data::tag::Tag' },
			typeArgs: [{ kind: 'string', attributes: [{ name: 'id', value: attribute }] }],
		}
	}
	return {
		kind: 'dispatcher',
		registry: 'minecraft:resource',
		parallelIndices: [{ kind: 'static', value: id }],
	}
}

function getCategory(type: string | undefined) {
	switch (type) {
		case 'item_modifier': return 'function'
		case 'predicate': return 'predicate'
		default: return undefined
	}
}

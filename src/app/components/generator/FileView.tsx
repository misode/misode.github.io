import type { DocAndNode } from '@spyglassmc/core'
import { JsonFileNode } from '@spyglassmc/json'
import { useErrorBoundary } from 'preact/hooks'
import { useDocAndNode, useSpyglass } from '../../contexts/Spyglass.jsx'
import { message } from '../../Utils.js'
import { ErrorPanel } from '../ErrorPanel.jsx'
import { JsonFileView } from './JsonFileView.jsx'

type FileViewProps = {
	docAndNode: DocAndNode | undefined,
}
export function FileView({ docAndNode: original }: FileViewProps) {
	const { serviceLoading } = useSpyglass()

	const [error, errorRetry] = useErrorBoundary()
	if (error) {
		const viewError = new Error(`Error viewing the file: ${message(error)}`)
		if (error.stack) {
			viewError.stack = error.stack
		}
		return <ErrorPanel error={viewError} onDismiss={errorRetry} />
	}

	const docAndNode = useDocAndNode(original)
	if (!docAndNode || serviceLoading) {
		return <div class="file-view flex flex-col gap-1">
			<div class="skeleton rounded-md h-[34px] w-[200px]"></div>
			<div class="skeleton rounded-md h-[34px] w-[240px]"></div>
			<div class="skeleton rounded-md h-[34px] w-[190px] ml-[18px]"></div>
			<div class="skeleton rounded-md h-[34px] w-[130px] ml-[18px]"></div>
			<div class="skeleton rounded-md h-[34px] w-[290px]"></div>
		</div>
	}

	const fileNode = docAndNode?.node.children[0]
	if (JsonFileNode.is(fileNode)) {
		return <JsonFileView docAndNode={docAndNode} node={fileNode.children[0]} />
	}

	return <ErrorPanel error={`Cannot view file ${docAndNode.doc.uri}`} />
}

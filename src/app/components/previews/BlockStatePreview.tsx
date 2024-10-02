import { DataModel } from '@mcschema/core'
import { BlockDefinition, Identifier, Structure, StructureRenderer } from 'deepslate/render'
import type { mat4 } from 'gl-matrix'
import { useCallback, useRef } from 'preact/hooks'
import { useVersion } from '../../contexts/index.js'
import { useAsync } from '../../hooks/useAsync.js'
import { AsyncCancel } from '../../hooks/useAsyncFn.js'
import { getResources, ResourceWrapper } from '../../services/Resources.js'
import type { PreviewProps } from './index.js'
import { InteractiveCanvas3D } from './InteractiveCanvas3D.jsx'

const PREVIEW_ID = Identifier.parse('misode:preview')

export const BlockStatePreview = ({ data, shown }: PreviewProps) => {
	const { version } = useVersion()
	const serializedData = JSON.stringify(data)

	const { value: resources } = useAsync(async () => {
		if (!shown) return AsyncCancel
		const resources = await getResources(version)
		const definition = BlockDefinition.fromJson(DataModel.unwrapLists(data))
		const wrapper = new ResourceWrapper(resources, {
			getBlockDefinition(id) {
				if (id.equals(PREVIEW_ID)) return definition
				return null
			},
		})
		return wrapper
	}, [shown, version, serializedData])

	const renderer = useRef<StructureRenderer | undefined>(undefined)

	const onSetup = useCallback((canvas: HTMLCanvasElement) => {
		if (!resources || !shown) return
		const gl = canvas.getContext('webgl')
		if (!gl) return
		renderer.current = new StructureRenderer(gl, new Structure([1, 1, 1]).addBlock([0, 0, 0], PREVIEW_ID), resources)
	}, [resources, shown])
	const onResize = useCallback((width: number, height: number) => {
		renderer.current?.setViewport(0, 0, width, height)
	}, [resources])
	const onDraw = useCallback((transform: mat4) => {
		renderer.current?.drawStructure(transform)
	}, [])

	return <>
		<div class="full-preview">
			<InteractiveCanvas3D onSetup={onSetup} onDraw={onDraw} onResize={onResize} startDistance={3} startPosition={[0.5, 0, 0.5]} startYRotation={2.5} />
		</div>
	</>
}

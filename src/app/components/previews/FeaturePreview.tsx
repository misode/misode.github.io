import { DataModel } from '@mcschema/core'
import { LegacyRandom, Structure, StructureRenderer } from 'deepslate'
import { BlockPos } from 'deepslate-1.18.2'
import type { mat4 } from 'gl-matrix'
import { useCallback, useMemo, useRef, useState } from 'preact/hooks'
import { randomSeed } from '../../Utils.js'
import { useLocale } from '../../contexts/index.js'
import { useAsync } from '../../hooks/useAsync.js'
import { AsyncCancel } from '../../hooks/useAsyncFn.js'
import { getResources } from '../../services/Resources.js'
import { Btn } from '../Btn.jsx'
import type { FeatureContext } from './Feature.js'
import { placeFeature } from './Feature.js'
import { InteractiveCanvas3D } from './InteractiveCanvas3D.jsx'
import { nextGaussian } from './WorldgenUtils.jsx'
import type { PreviewProps } from './index.js'

const MAX_SIZE = 25

export const FeaturePreview = ({ data, version, shown }: PreviewProps) => {
	const { locale } = useLocale()
	const [seed, setSeed] = useState(randomSeed())
	const serializedData = JSON.stringify(data)

	const { value: resources } = useAsync(async () => {
		if (!shown) return AsyncCancel
		return await getResources(version)
	}, [shown, version, serializedData])

	const { structure } = useMemo(() => {
		const structure = new Structure([MAX_SIZE, MAX_SIZE, MAX_SIZE])
		const random = new LegacyRandom(seed)
		const placeOffset = Math.floor((MAX_SIZE - 1) / 2)
		const context: FeatureContext = {
			version: version,
			random,
			place: (pos, block) => {
				const structurePos = BlockPos.offset(pos, placeOffset, 0, placeOffset)
				if (structurePos.some(v => v < 0 || v >= MAX_SIZE)) return
				const name = typeof block === 'string' ? block : block.getName()
				const properties = typeof block === 'string' ? undefined : block.getProperties()
				structure.addBlock(structurePos, name, properties)
			},
			nextFloat: () => random.nextFloat(),
			nextInt: (max: number) => random.nextInt(max),
			nextGaussian: nextGaussian(random),
		}
		placeFeature(DataModel.unwrapLists(data), context)
		return { structure }
	}, [serializedData, version, seed])

	const renderer = useRef<StructureRenderer | undefined>(undefined)

	const onSetup = useCallback((canvas: HTMLCanvasElement) => {
		if (!resources || !shown) return
		const gl = canvas.getContext('webgl')
		if (!gl) return
		renderer.current = new StructureRenderer(gl, structure, resources)
	}, [resources, shown, structure])
	const onResize = useCallback((width: number, height: number) => {
		renderer.current?.setViewport(0, 0, width, height)
	}, [resources])
	const onDraw = useCallback((transform: mat4) => {
		renderer.current?.drawStructure(transform)
	}, [])

	return <>
		<div class="controls preview-controls">
			<Btn icon="sync" tooltip={locale('generate_new_seed')} onClick={() => setSeed(randomSeed())} />
		</div>
		<div class="full-preview">
			<InteractiveCanvas3D onSetup={onSetup} onDraw={onDraw} onResize={onResize} startDistance={10} startPosition={[MAX_SIZE/2, 0, MAX_SIZE/2]} startYRotation={2.6} />
		</div>
	</>
}

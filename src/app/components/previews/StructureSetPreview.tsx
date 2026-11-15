import { ChunkPos } from 'deepslate'
import type { mat3 } from 'gl-matrix'
import { useCallback, useMemo, useRef, useState } from 'preact/hooks'
import { useLocale, useVersion } from '../../contexts/index.js'
import { useAsync } from '../../hooks/useAsync.js'
import type { Color } from '../../Utils.js'
import { computeIfAbsent, iterateWorld2D, randomSeed, safeJsonParse, stringToColor } from '../../Utils.js'
import { ErrorPanel } from '../ErrorPanel.jsx'
import { Btn } from '../index.js'
import { featureColors } from './Decorator.js'
import { Deepslate } from './Deepslate.js'
import type { PreviewProps } from './index.js'
import { InteractiveCanvas2D } from './InteractiveCanvas2D.jsx'

export const StructureSetPreview = ({ docAndNode, shown }: PreviewProps) => {
	const { locale } = useLocale()
	const { version } = useVersion()
	const [seed, setSeed] = useState(randomSeed())

	const text = docAndNode.doc.getText()

	const { value: deepslate } = useAsync(async () => {
		return Deepslate.load(version)
	}, [version])

	const { value: structureSet, error: structureError } = useAsync(async () => {
		if (!deepslate) return undefined
		return deepslate.initStructureSet(seed, safeJsonParse(text) ?? {})
	}, [deepslate, text, seed])

	const { chunkStructures, structureColors } = useMemo(() => {
		return {
			chunkStructures: new Map<string, string | undefined>(),
			structureColors: new Map<string, Color>(),
		}
	}, [structureSet])

	const ctx = useRef<CanvasRenderingContext2D>()
	const imageData = useRef<ImageData>()
	const [focused, setFocused] = useState<string[]>([])

	const onSetup = useCallback(function onSetup(canvas: HTMLCanvasElement) {
		const ctx2D = canvas.getContext('2d')
		if (!ctx2D) return
		ctx.current = ctx2D
	}, [])
	const onResize = useCallback(function onResize(width: number, height: number) {
		if (!ctx.current) return
		imageData.current = ctx.current.getImageData(0, 0, width, height)
	}, [])
	const onDraw = useCallback(function onDraw(transform: mat3) {
		if (!ctx.current || !imageData.current || !shown || !structureSet) return
		iterateWorld2D(imageData.current, transform, (x, y) => {
			const pos = ChunkPos.create(x, y)
			const structure = computeIfAbsent(chunkStructures, `${pos[0]} ${pos[1]}`, () => structureSet.getStructure(pos[0], pos[1]))
			return { structure, pos }
		}, ({ structure, pos }) => {
			if (structure !== undefined) {
				const color = computeIfAbsent(structureColors, structure, () => {
					const index = structureColors.size
					return index < featureColors.length ? featureColors[index] : stringToColor(structure)
				})
				return [0.8 * color[0], 0.8 * color[1], 0.8 * color[2]]
			}
			if ((Math.floor(pos[0] / 32) + Math.floor(pos[1] / 32)) % 2 === 0) {
				return [0.85 * 256, 0.85 * 256, 0.85 * 256]
			}
			return [256, 256, 256]
		})
		ctx.current.putImageData(imageData.current, 0, 0)
	}, [structureSet, chunkStructures, structureColors, shown])
	const onHover = useCallback(function onHover(pos: [number, number] | undefined) {
		if (!pos || !structureSet) {
			setFocused([])
		} else {
			const [x, y] = pos
			const structure = structureSet.getStructure(x, -y)
			setFocused([...(structure ? [structure.toString().replace(/^minecraft:/, '')] : []), `X=${x << 4} Z=${(-y) << 4}`])
		}
	}, [structureSet])

	if (structureError) {
		return <ErrorPanel error={structureError} prefix="Failed to initialize structure set: " />
	}

	return <>
		<div class="controls preview-controls">
			{focused.map(s => <Btn label={s} class="no-pointer" /> )}
			<Btn icon="sync" tooltip={locale('generate_new_seed')}
				onClick={() => setSeed(randomSeed())} />
		</div>
		<div class="full-preview">
			<InteractiveCanvas2D onSetup={onSetup} onResize={onResize} onDraw={onDraw} onHover={onHover} pixelSize={4} startScale={1/8} minScale={1/32} maxScale={1/2} />
		</div>
	</>
}

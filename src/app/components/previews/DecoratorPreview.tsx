import { BlockPos, ChunkPos, LegacyRandom, PerlinNoise } from 'deepslate'
import type { mat3 } from 'gl-matrix'
import { useCallback, useMemo, useRef, useState } from 'preact/hooks'
import { computeIfAbsent, iterateWorld2D, randomSeed } from '../../Utils.js'
import { useLocale } from '../../contexts/index.js'
import { Btn } from '../index.js'
import type { PlacedFeature, PlacementContext } from './Decorator.js'
import { decorateChunk } from './Decorator.js'
import { InteractiveCanvas2D } from './InteractiveCanvas2D.jsx'
import { nextGaussian } from './WorldgenUtils.jsx'
import type { PreviewProps } from './index.js'

export const DecoratorPreview = ({ data, version, shown }: PreviewProps) => {
	const { locale } = useLocale()
	const [seed, setSeed] = useState(randomSeed())
	const state = JSON.stringify(data)

	const { context, chunkFeatures } = useMemo(() => {
		const random = new LegacyRandom(seed)
		const context: PlacementContext = {
			placements: [],
			features: [],
			random,
			biomeInfoNoise: new PerlinNoise(random.fork(), 0, [1]),
			seaLevel: 63,
			version: version,
			nextFloat: () => random.nextFloat(),
			nextInt: (max: number) => random.nextInt(max),
			nextGaussian: nextGaussian(random),
		}
		return {
			context,
			chunkFeatures: new Map<string, PlacedFeature[]>(),
		}
	}, [state, version, seed])

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
		if (!ctx.current || !imageData.current || !shown) return

		iterateWorld2D(imageData.current, transform, (x, y) => {
			const pos = ChunkPos.create(Math.floor(x / 16), Math.floor(-y / 16))
			const features = computeIfAbsent(chunkFeatures, `${pos[0]} ${pos[1]}`, () => decorateChunk(pos, data, context))
			return features.find(f => f.pos[0] === x && f.pos[2] == -y) ?? { pos: BlockPos.create(x, 0, -y) }
		}, (feature) => {
			if ('color' in feature) {
				return feature.color
			}
			if ((Math.floor(feature.pos[0] / 16) + Math.floor(feature.pos[2] / 16)) % 2 === 0) {
				return [0.85 * 256, 0.85 * 256, 0.85 * 256]
			}
			return [256, 256, 256]
		})
		ctx.current.putImageData(imageData.current, 0, 0)
	}, [context, chunkFeatures, shown])
	const onHover = useCallback(function onHover(pos: [number, number] | undefined) {
		if (!pos) {
			setFocused([])
		} else {
			const [x, y] = pos
			setFocused([`X=${x} Z=${-y}`])
		}
	}, [])

	return <>
		<div class="controls preview-controls">
			{focused.map(s => <Btn label={s} class="no-pointer" /> )}
			<Btn icon="sync" tooltip={locale('generate_new_seed')}
				onClick={() => setSeed(randomSeed())} />
		</div>
		<div class="full-preview">
			<InteractiveCanvas2D onSetup={onSetup} onResize={onResize} onDraw={onDraw} onHover={onHover} pixelSize={4} startScale={1/8} minScale={1/32} maxScale={1} />
		</div>
	</>
}

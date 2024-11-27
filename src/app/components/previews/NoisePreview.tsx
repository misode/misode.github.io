import { clampedMap, NoiseParameters, NormalNoise, XoroshiroRandom } from 'deepslate'
import type { mat3 } from 'gl-matrix'
import { useCallback, useMemo, useRef, useState } from 'preact/hooks'
import { useLocale } from '../../contexts/index.js'
import { Store } from '../../Store.js'
import { iterateWorld2D, randomSeed, safeJsonParse } from '../../Utils.js'
import { Btn } from '../index.js'
import type { ColormapType } from './Colormap.js'
import { getColormap } from './Colormap.js'
import { ColormapSelector } from './ColormapSelector.jsx'
import type { PreviewProps } from './index.js'
import { InteractiveCanvas2D } from './InteractiveCanvas2D.jsx'

export const NoisePreview = ({ docAndNode, shown }: PreviewProps) => {
	const { locale } = useLocale()
	const [seed, setSeed] = useState(randomSeed())

	const text = docAndNode.doc.getText()

	const noise = useMemo(() => {
		const random = XoroshiroRandom.create(seed)
		const params = NoiseParameters.fromJson(safeJsonParse(text) ?? {})
		return new NormalNoise(random, params)
	}, [text, seed])

	const imageData = useRef<ImageData>()
	const ctx = useRef<CanvasRenderingContext2D>()
	const [focused, setFocused] = useState<string[]>([])
	const [colormap, setColormap] = useState<ColormapType>(Store.getColormap() ?? 'viridis')

	const onSetup = useCallback((canvas: HTMLCanvasElement) => {
		const ctx2D = canvas.getContext('2d')
		if (!ctx2D) return
		ctx.current = ctx2D
	}, [])
	const onResize = useCallback((width: number, height: number) => {
		if (!ctx.current) return
		imageData.current = ctx.current.getImageData(0, 0, width, height)
	}, [])
	const onDraw = useCallback((transform: mat3) => {
		if (!ctx.current || !imageData.current || !shown) return

		const colorPicker = getColormap(colormap)
		iterateWorld2D(imageData.current, transform, (x, y) => {
			return noise.sample(x, y, 0)
		}, (value) => {
			const color = colorPicker(clampedMap(value, -1, 1, 1, 0))
			return [color[0] * 256, color[1] * 256, color[2] * 256]
		})
		ctx.current.putImageData(imageData.current, 0, 0)
	}, [noise, colormap, shown])
	const onHover = useCallback((pos: [number, number] | undefined) => {
		if (!pos) {
			setFocused([])
		} else {
			const [x, y] = pos
			const output = noise.sample(x, -y, 0)
			setFocused([output.toPrecision(3), `X=${x} Y=${-y}`])
		}
	}, [noise])

	return <>
		<div class="controls preview-controls">
			{focused.map(s => <Btn label={s} class="no-pointer" /> )}
			<ColormapSelector value={colormap} onChange={setColormap} />
			<Btn icon="sync" tooltip={locale('generate_new_seed')}
				onClick={() => setSeed(randomSeed())} />
		</div>
		<div class="full-preview">
			<InteractiveCanvas2D onSetup={onSetup} onResize={onResize} onDraw={onDraw} onHover={onHover} pixelSize={4} />
		</div>
	</>
}

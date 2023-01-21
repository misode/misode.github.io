import { DataModel } from '@mcschema/core'
import { clampedMap, NoiseParameters, NormalNoise, XoroshiroRandom } from 'deepslate'
import type { mat3 } from 'gl-matrix'
import { vec2 } from 'gl-matrix'
import { useCallback, useMemo, useRef, useState } from 'preact/hooks'
import { useLocale } from '../../contexts/index.js'
import { Store } from '../../Store.js'
import { randomSeed } from '../../Utils.js'
import { Btn } from '../index.js'
import type { ColormapType } from './Colormap.js'
import { getColormap } from './Colormap.js'
import { ColormapSelector } from './ColormapSelector.jsx'
import type { PreviewProps } from './index.js'
import { InteractiveCanvas2D } from './InteractiveCanvas2D.jsx'

export const NoisePreview = ({ data, shown }: PreviewProps) => {
	const { locale } = useLocale()
	const [seed, setSeed] = useState(randomSeed())
	const state = JSON.stringify(data)

	const noise = useMemo(() => {
		const random = XoroshiroRandom.create(seed)
		const params = NoiseParameters.fromJson(DataModel.unwrapLists(data))
		return new NormalNoise(random, params)
	}, [state, seed])

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
		const img = imageData.current

		const pos = vec2.create()
		const colorPicker = getColormap(colormap)
		for (let x = 0; x < img.width; x += 1) {
			for (let y = 0; y < img.height; y += 1) {
				const i = x * 4 + y * 4 * img.width
				vec2.transformMat3(pos, vec2.fromValues(x, y), transform)
				const worldX = Math.floor(pos[0])
				const worldY = -Math.floor(pos[1])
				const output = noise.sample(worldX, worldY, 0)
				const color = colorPicker(clampedMap(output, -1, 1, 1, 0))
				img.data[i] = color[0] * 256
				img.data[i + 1] = color[1] * 256
				img.data[i + 2] = color[2] * 256
				img.data[i + 3] = 255
			}
		}
		ctx.current.putImageData(img, 0, 0)
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

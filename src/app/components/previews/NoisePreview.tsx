import { useEffect, useRef, useState } from 'preact/hooks'
import { useLocale } from '../../contexts/index.js'
import { useCanvas } from '../../hooks/index.js'
import type { ColormapType } from '../../previews/Colormap.js'
import { normalNoise, normalNoisePoint } from '../../previews/index.js'
import { Store } from '../../Store.js'
import { randomSeed } from '../../Utils.js'
import { Btn } from '../index.js'
import { ColormapSelector } from './ColormapSelector.jsx'
import type { PreviewProps } from './index.js'

export const NoisePreview = ({ data, shown, version }: PreviewProps) => {
	const { locale } = useLocale()
	const [seed, setSeed] = useState(randomSeed())
	const [scale, setScale] = useState(2)
	const [focused, setFocused] = useState<string[]>([])
	const [colormap, setColormap] = useState<ColormapType>(Store.getColormap() ?? 'viridis')
	const offset = useRef<[number, number]>([0, 0])
	const state = JSON.stringify([data])

	const { canvas, redraw } = useCanvas({
		size() {
			return [256, 256]
		},
		async draw(img) {
			const options = { offset: offset.current, scale, seed, version, colormap }
			normalNoise(data, img, options)
		},
		async onDrag(dx, dy) {
			offset.current[0] = offset.current[0] + dx * 256
			offset.current[1] = offset.current[1] + dy * 256
			redraw()
		},
		onHover(x, y) {
			const x2 = Math.floor(x * 256)
			const y2 = Math.floor(y * 256)
			const options = { offset: offset.current, scale, seed, version, colormap }
			const value = normalNoisePoint(data, x2, y2, options)
			
			const ox = -options.offset[0] - 100
			const oy = -options.offset[1] - 100
			const xx = (x2 + ox) * options.scale
			const yy = (y2 + oy) * options.scale
			setFocused([value.toPrecision(3), `X=${Math.floor(xx)} Y=${Math.floor(yy)}`])
		},
		onLeave() {
			setFocused([])
		},
	}, [version, state, scale, seed, colormap])

	useEffect(() => {
		if (shown) {
			redraw()
		}
	}, [version, state, scale, seed, colormap, shown])

	const changeScale = (newScale: number) => {
		offset.current[0] = offset.current[0] * scale / newScale
		offset.current[1] = offset.current[1] * scale / newScale
		setScale(newScale)
	}

	return <>
		<div class="controls preview-controls">
			{focused.map(s => <Btn label={s} class="no-pointer" /> )}
			<ColormapSelector value={colormap} onChange={setColormap} />
			<Btn icon="dash" tooltip={locale('zoom_out')}
				onClick={() => changeScale(scale * 1.5)} />
			<Btn icon="plus" tooltip={locale('zoom_in')}
				onClick={() => changeScale(scale / 1.5)} />
			<Btn icon="sync" tooltip={locale('generate_new_seed')}
				onClick={() => setSeed(randomSeed())} />
		</div>
		<canvas ref={canvas} width="256" height="256"></canvas>
	</>
}

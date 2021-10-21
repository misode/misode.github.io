import { useEffect, useRef, useState } from 'preact/hooks'
import type { PreviewProps } from '.'
import { Btn } from '..'
import { useCanvas } from '../../hooks'
import { locale } from '../../Locales'
import { normalNoise } from '../../previews'
import { randomSeed } from '../../Utils'

export const NoisePreview = ({ lang, data, shown, version }: PreviewProps) => {
	const [seed, setSeed] = useState(randomSeed())
	const [scale, setScale] = useState(2)
	const offset = useRef<[number, number]>([0, 0])
	const state = JSON.stringify([data])

	const { canvas, redraw } = useCanvas({
		size() {
			return [256, 256]
		},
		async draw(img) {
			const options = { offset: offset.current, scale, seed, version }
			normalNoise(data, img, options)
		},
		async onDrag(dx, dy) {
			offset.current[0] = offset.current[0] + dx * 256
			offset.current[1] = offset.current[1] + dy * 256
			redraw()
		},
	}, [state, scale, seed])

	useEffect(() => {
		if (shown) {
			redraw()
		}
	}, [state, scale, seed, shown])

	const changeScale = (newScale: number) => {
		offset.current[0] = offset.current[0] * scale / newScale
		offset.current[1] = offset.current[1] * scale / newScale
		setScale(newScale)
	}

	return <>
		<div class="controls">
			<Btn icon="dash" tooltip={locale(lang, 'zoom_out')}
				onClick={() => changeScale(scale * 1.5)} />
			<Btn icon="plus" tooltip={locale(lang, 'zoom_in')}
				onClick={() => changeScale(scale / 1.5)} />
			<Btn icon="sync" tooltip={locale(lang, 'generate_new_seed')}
				onClick={() => setSeed(randomSeed())} />
		</div>
		<canvas ref={canvas} width="256" height="256"></canvas>
	</>
}

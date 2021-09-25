import { useEffect, useState } from 'preact/hooks'
import type { PreviewProps } from '.'
import { Btn } from '..'
import { useCanvas } from '../../hooks'
import { locale } from '../../Locales'
import { decorator } from '../../previews'
import { randomSeed } from '../../Utils'

export const DecoratorPreview = ({ data, version, shown, lang }: PreviewProps) => {
	const [scale, setScale] = useState(4)
	const [seed, setSeed] = useState(randomSeed())

	const { canvas, redraw } = useCanvas({
		size() {
			return [scale * 16, scale * 16]
		},
		async draw(img) {
			decorator(data, img, { seed, version, size: [scale * 16, 128, scale * 16] })
		},
	})

	const state = JSON.stringify(data)
	useEffect(() => {
		if (shown) {
			redraw()
		}
	}, [state, scale, seed, shown])

	return <>
		<div class="controls">
			<Btn icon="dash" tooltip={locale(lang, 'zoom_out')}
				onClick={() => setScale(Math.min(16, scale + 1))} />
			<Btn icon="plus" tooltip={locale(lang, 'zoom_in')}
				onClick={() => setScale(Math.max(1, scale - 1))} />
			<Btn icon="sync" tooltip={locale(lang, 'generate_new_seed')}
				onClick={() => setSeed(randomSeed())} />
		</div>
		<canvas ref={canvas} width="64" height="64"></canvas>
	</>
}

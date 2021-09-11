import { useEffect, useRef, useState } from 'preact/hooks'
import type { PreviewProps } from '.'
import { Btn, BtnInput, BtnMenu } from '..'
import { useOnDrag } from '../../hooks'
import { locale } from '../../Locales'
import { noiseSettings } from '../../previews'
import { randomSeed } from '../../Utils'

export const NoiseSettingsPreview = ({ lang, data, shown, version }: PreviewProps) => {
	const loc = locale.bind(null, lang)
	const [seed, setSeed] = useState(randomSeed())
	const [biomeDepth, setBiomeDepth] = useState(0.1)
	const [biomeScale, setBiomeScale] = useState(0.2)

	const canvas = useRef<HTMLCanvasElement>(null)
	const offset = useRef<number>(0)
	const redraw = useRef<Function>()

	useEffect(() => {
		redraw.current = () => {
			const ctx = canvas.current.getContext('2d')!
			const size = data?.noise?.height ?? 256
			canvas.current.width = size
			canvas.current.height = size
			const img = ctx.createImageData(canvas.current.width, canvas.current.height)
			noiseSettings(data, img, { biomeDepth, biomeScale, offset: offset.current, width: size, seed, version })
			ctx.putImageData(img, 0, 0)
		}
	})

	useOnDrag(canvas.current, (dx) => {
		const x = dx * canvas.current.width / canvas.current.clientWidth
		offset.current = offset.current + x
		redraw.current()
	})

	const state = JSON.stringify(data)
	useEffect(() => {
		if (shown) {
			redraw.current()
		}
	}, [state, biomeDepth, biomeScale, seed, shown])

	return <>
		<div class="controls">
			<BtnMenu icon="gear">
				<BtnInput label={loc('preview.depth')} value={`${biomeDepth}`} onChange={v => setBiomeDepth(Number(v))} />
				<BtnInput label={loc('preview.scale')} value={`${biomeScale}`} onChange={v => setBiomeScale(Number(v))} />
			</BtnMenu>
			<Btn icon="sync" onClick={() => setSeed(randomSeed())} />
		</div>
		<canvas ref={canvas} width="200" height={data.height}></canvas>
	</>
}

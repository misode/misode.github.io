import type { DataModel } from '@mcschema/core'
import { useEffect, useRef, useState } from 'preact/hooks'
import { Btn, BtnInput, BtnMenu } from '..'
import { useOnDrag } from '../../hooks'
import { locale } from '../../Locales'
import { noiseSettings } from '../../previews'
import { hexId } from '../../Utils'

type NoiseSettingsProps = {
	lang: string,
	model: DataModel,
	data: any,
	shown: boolean,
}
export const NoiseSettingsPreview = ({ lang, data, shown }: NoiseSettingsProps) => {
	const loc = locale.bind(null, lang)
	const [seed, setSeed] = useState(hexId())
	const [biomeDepth, setBiomeDepth] = useState(0.1)
	const [biomeScale, setBiomeScale] = useState(0.2)

	const canvas = useRef<HTMLCanvasElement>(null)
	const offset = useRef<number>(0)
	const redraw = useRef<Function>()

	useEffect(() => {
		redraw.current = () => {
			const ctx = canvas.current.getContext('2d')!
			const size = data.height
			canvas.current.width = size
			canvas.current.height = size
			const img = ctx.createImageData(canvas.current.width, canvas.current.height)
			noiseSettings(data, img, { biomeDepth, biomeScale, offset: offset.current, width: size, seed })
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
				<BtnInput type="number" label={loc('preview.depth')} value={`${biomeDepth}`} onChange={v => setBiomeDepth(Number(v))} />
				<BtnInput type="number" label={loc('preview.scale')} value={`${biomeScale}`} onChange={v => setBiomeScale(Number(v))} />
			</BtnMenu>
			<Btn icon="sync" onClick={() => setSeed(hexId())} />
		</div>
		<canvas ref={canvas} width="200" height={data.height}></canvas>
	</>
}

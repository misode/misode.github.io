import { useEffect, useState } from 'preact/hooks'
import type { PreviewProps } from '.'
import { Btn, BtnInput, BtnMenu } from '..'
import { useCanvas } from '../../hooks'
import { locale } from '../../Locales'
import { noiseSettings } from '../../previews'
import { randomSeed } from '../../Utils'

export const NoiseSettingsPreview = ({ lang, data, shown, version }: PreviewProps) => {
	const loc = locale.bind(null, lang)
	const [seed, setSeed] = useState(randomSeed())
	const [biomeDepth, setBiomeDepth] = useState(0.1)
	const [biomeScale, setBiomeScale] = useState(0.2)

	const size = data?.noise?.height ?? 256
	const { canvas, redraw } = useCanvas({
		data() {
			return undefined
		},
		size() {
			return [size, size]
		},
		async draw(img, { offset }) {
			noiseSettings(data, img, { biomeDepth, biomeScale, offset: offset[0], width: img.width, seed, version })
		},
	})

	const state = JSON.stringify(data)
	useEffect(() => {
		if (shown) {
			redraw()
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
		<canvas ref={canvas} width={size} height={size}></canvas>
	</>
}

import { useEffect, useRef, useState } from 'preact/hooks'
import type { PreviewProps } from '.'
import { Btn, BtnInput, BtnMenu } from '..'
import { useCanvas } from '../../hooks'
import { locale } from '../../Locales'
import { noiseSettings } from '../../previews'
import { checkVersion } from '../../Schemas'
import { randomSeed } from '../../Utils'

export const NoiseSettingsPreview = ({ lang, data, shown, version }: PreviewProps) => {
	const loc = locale.bind(null, lang)
	const [seed, setSeed] = useState(randomSeed())
	const [biomeFactor, setBiomeFactor] = useState(0.2)
	const [biomeOffset, setBiomeOffset] = useState(0.1)
	const [biomePeaks, setBiomePeaks] = useState(0)
	const [focused, setFocused] = useState<string | undefined>(undefined)
	const offset = useRef(0)
	const state = JSON.stringify(data)

	const hasPeaks = checkVersion(version, '1.18')
	useEffect(() => {
		setBiomeFactor(hasPeaks ? 600 : 0.2)
		setBiomeOffset(hasPeaks ? 0.05 : 0.1)
	}, [hasPeaks])

	const size = data?.noise?.height ?? 256
	const { canvas, redraw } = useCanvas({
		size() {
			return [size, size]
		},
		async draw(img) {
			const options = { biomeOffset, biomeFactor, biomePeaks, offset: offset.current, width: img.width, seed, version }
			noiseSettings(data, img, options)
		},
		async onDrag(dx) {
			offset.current += dx * size
			redraw()
		},
		async onHover(_, y) {
			const worldY = size - Math.max(1, Math.ceil(y * size)) + (data?.noise?.min_y ?? 0)
			setFocused(`${worldY}`)
		},
		onLeave() {
			setFocused(undefined)
		},
	}, [state, biomeFactor, biomeOffset, biomePeaks, seed])

	useEffect(() => {
		if (shown) {
			redraw()
		}
	}, [state, biomeFactor, biomeOffset, biomePeaks, seed, shown])

	return <>
		<div class="controls">
			{focused && <Btn label={`Y = ${focused}`} class="no-pointer" />}
			<BtnMenu icon="gear">
				{hasPeaks ? <>
					<BtnInput label={loc('preview.factor')} value={`${biomeFactor}`} onChange={v => setBiomeFactor(Number(v))} />
					<BtnInput label={loc('preview.offset')} value={`${biomeOffset}`} onChange={v => setBiomeOffset(Number(v))} />
					<BtnInput label={loc('preview.peaks')} value={`${biomePeaks}`} onChange={v => setBiomePeaks(Number(v))} />
				</> : <>
					<BtnInput label={loc('preview.scale')} value={`${biomeFactor}`} onChange={v => setBiomeFactor(Number(v))} />
					<BtnInput label={loc('preview.depth')} value={`${biomeOffset}`} onChange={v => setBiomeOffset(Number(v))} />
				</>}
			</BtnMenu>
			<Btn icon="sync" onClick={() => setSeed(randomSeed())} />
		</div>
		<canvas ref={canvas} width={size} height={size}></canvas>
	</>
}

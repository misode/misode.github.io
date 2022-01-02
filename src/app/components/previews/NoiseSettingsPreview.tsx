import { useEffect, useRef, useState } from 'preact/hooks'
import type { PreviewProps } from '.'
import { Btn, BtnInput, BtnMenu } from '..'
import { useLocale } from '../../contexts'
import { useCanvas } from '../../hooks'
import { noiseSettings } from '../../previews'
import { checkVersion } from '../../services'
import { randomSeed } from '../../Utils'

export const NoiseSettingsPreview = ({ data, shown, version }: PreviewProps) => {
	const { locale } = useLocale()
	const [seed, setSeed] = useState(randomSeed())
	const [biomeScale, setBiomeScale] = useState(0.2)
	const [biomeDepth, setBiomeDepth] = useState(0.1)
	const [focused, setFocused] = useState<string | undefined>(undefined)
	const offset = useRef(0)
	const state = JSON.stringify([data, biomeScale, biomeDepth])

	const size = data?.noise?.height ?? 256
	const { canvas, redraw } = useCanvas({
		size() {
			return [size, size]
		},
		async draw(img) {
			const options = { biomeDepth, biomeScale, offset: offset.current, width: img.width, seed, version }
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
	}, [state, seed])

	useEffect(() => {
		if (shown) {
			redraw()
		}
	}, [state, seed, shown])

	return <>
		<div class="controls">
			{focused && <Btn label={`Y = ${focused}`} class="no-pointer" />}
			{checkVersion(version, undefined, '1.17') &&
				<BtnMenu icon="gear" tooltip={locale('terrain_settings')}>
					<BtnInput label={locale('preview.scale')} value={`${biomeScale}`} onChange={v => setBiomeScale(Number(v))} />
					<BtnInput label={locale('preview.depth')} value={`${biomeDepth}`} onChange={v => setBiomeDepth(Number(v))} />
				</BtnMenu>
			}
			<Btn icon="sync" tooltip={locale('generate_new_seed')}
				onClick={() => setSeed(randomSeed())} />
		</div>
		<canvas ref={canvas} width={size} height={size}></canvas>
	</>
}

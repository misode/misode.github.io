import { useEffect, useRef, useState } from 'preact/hooks'
import { useLocale, useProject } from '../../contexts/index.js'
import { useCanvas } from '../../hooks/index.js'
import { densityFunction } from '../../previews/index.js'
import { randomSeed } from '../../Utils.js'
import { Btn, BtnMenu } from '../index.js'
import type { PreviewProps } from './index.js'

export const DensityFunctionPreview = ({ data, shown, version }: PreviewProps) => {
	const { locale } = useLocale()
	const { project } = useProject()
	const [seed, setSeed] = useState(randomSeed())
	const [autoScroll, setAutoScroll] = useState(false)
	const [focused, setFocused] = useState<string | undefined>(undefined)
	const offset = useRef(0)
	const scrollInterval = useRef<number | undefined>(undefined)
	const state = JSON.stringify([data])

	const size = data?.noise?.height ?? 256
	const { canvas, redraw } = useCanvas({
		size() {
			return [size, size]
		},
		async draw(img) {
			const options = { offset: offset.current, width: img.width, seed, version, project }
			await densityFunction(data, img, options)
		},
		async onDrag(dx) {
			offset.current += dx * size
			redraw()
		},
		async onHover(x, y) {
			const worldX = Math.floor(x * size - offset.current)
			const worldY = size - Math.max(1, Math.ceil(y * size)) + (data?.noise?.min_y ?? 0)
			setFocused(`X=${worldX} Y=${worldY}`)
		},
		onLeave() {
			setFocused(undefined)
		},
	}, [version, state, seed, project])

	useEffect(() => {
		if (scrollInterval.current) {
			clearInterval(scrollInterval.current)
		}
		if (shown) {
			redraw()
			if (autoScroll) {
				scrollInterval.current = setInterval(() => {
					offset.current -= 8
					redraw()
				}, 100) as any
			}
		}
	}, [version, state, seed, project, shown, autoScroll])

	return <>
		<div class="controls preview-controls">
			{focused && <Btn label={focused} class="no-pointer" />}
			<BtnMenu icon="gear" tooltip={locale('terrain_settings')}>
				<Btn icon={autoScroll ? 'square_fill' : 'square'} label={locale('preview.auto_scroll')} onClick={() => setAutoScroll(!autoScroll)} />
			</BtnMenu>
			<Btn icon="sync" tooltip={locale('generate_new_seed')}
				onClick={() => setSeed(randomSeed())} />
		</div>
		<canvas ref={canvas} width={size} height={size}></canvas>
	</>
}

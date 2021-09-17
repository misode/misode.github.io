import { useEffect, useRef, useState } from 'preact/hooks'
import type { PreviewProps } from '.'
import { Btn } from '..'
import { useCanvas } from '../../hooks'
import { biomeMap, getBiome } from '../../previews'
import { randomSeed } from '../../Utils'

export const BiomeSourcePreview = ({ data, shown, version }: PreviewProps) => {
	const [scale, setScale] = useState(2)
	const [seed, setSeed] = useState(randomSeed())
	const [focused, setFocused] = useState<string | undefined>(undefined)
	const state = JSON.stringify(data)
	const type: string = data.type?.replace(/^minecraft:/, '')
	const offset = useRef<[number, number]>([0, 0])
	const res = useRef(1)
	const refineTimeout = useRef<number>(undefined)

	const { canvas, redraw } = useCanvas({
		size() {
			return [200 / res.current, 200 / res.current]
		},
		async draw(img) {
			const options = { biomeColors: {}, offset: offset.current, scale, seed, res: res.current, version }
			await biomeMap(data, img, options)
			if (res.current === 4) {
				clearTimeout(refineTimeout.current)
				refineTimeout.current = setTimeout(() => {
					res.current = 1
					redraw()
				}, 150)
			}
		},
		async onDrag(dx, dy) {
			offset.current[0] = offset.current[0] + dx * 200
			offset.current[1] = offset.current[1] + dy * 200
			clearTimeout(refineTimeout.current)
			res.current = type === 'multi_noise' ? 4 : 1
			redraw()
		},
		async onHover(x, y) {
			const options = { biomeColors: {}, offset: offset.current, scale, seed, res: 1, version }
			const biome = await getBiome(data, x * 200, y * 200, options)
			setFocused(biome)
		},
		onLeave() {
			setFocused(undefined)
		},
	}, [state, scale, seed])

	useEffect(() => {
		if (shown) {
			res.current = type === 'multi_noise' ? 4 : 1
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
			{focused && <Btn label={focused} class="no-pointer" />}
			{(type === 'multi_noise' || type === 'checkerboard') && <>
				<Btn icon="dash" onClick={() => changeScale(scale * 1.5)} />
				<Btn icon="plus" onClick={() => changeScale(scale / 1.5)} />
			</>}
			{type === 'multi_noise' &&
				<Btn icon="sync" onClick={() => setSeed(randomSeed())} />}
		</div>
		<canvas ref={canvas} width="200" height="200"></canvas>
	</>
}

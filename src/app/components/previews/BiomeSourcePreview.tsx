import { useEffect, useState } from 'preact/hooks'
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

	const { canvas, redraw, move } = useCanvas<number>({
		data() {
			return type === 'multi_noise' ? 4 : 1
		},
		size({ data: res }) {
			return [200 / res, 200 / res]
		},
		async draw(img, { data: res, offset }, schedule) {
			const options = { biomeColors: {}, offset, scale, seed, res, version }
			await biomeMap(data, img, options)
			if (res === 4) {
				schedule(150, 1)
			}
		},
		async point(x, y, { offset }) {
			const options = { biomeColors: {}, offset, scale, seed, res: 1, version }
			const biome = await getBiome(data, x, y, options)
			setFocused(biome)
		},
		async leave() {
			setFocused(undefined)
		},
	}, [state, scale, seed])

	useEffect(() => {
		if (shown) {
			redraw()
		}
	}, [state, scale, seed, shown])

	const changeScale = (newScale: number) => {
		move(offset => [offset[0] * scale / newScale, offset[1] * scale / newScale])
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

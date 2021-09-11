import { useEffect, useRef, useState } from 'preact/hooks'
import type { PreviewProps } from '.'
import { Btn } from '..'
import { useOnDrag, useOnHover } from '../../hooks'
import { biomeMap, getBiome } from '../../previews'
import { randomSeed } from '../../Utils'

export const BiomeSourcePreview = ({ data, shown, version }: PreviewProps) => {
	const [scale, setScale] = useState(2)
	const [seed, setSeed] = useState(randomSeed())
	const [focused, setFocused] = useState<string | undefined>(undefined)
	const type: string = data.type?.replace(/^minecraft:/, '')

	const canvas = useRef<HTMLCanvasElement>(null)
	const offset = useRef<[number, number]>([0, 0])
	const redrawTimeout = useRef(undefined)
	const redraw = useRef<Function>()
	const refocus = useRef<Function>()

	useEffect(() => {
		redraw.current = (res = 4) => {
			if (!shown || !data || !canvas.current) return
			let next = 0
			if (type === 'multi_noise' && res === 4) {
				next = 1
			} else {
				res = 1
			}
			const ctx = canvas.current.getContext('2d')!
			canvas.current.width = 200 / res
			canvas.current.height = 200 / res
			const img = ctx.getImageData(0, 0, canvas.current.width, canvas.current.height)
			const options = { biomeColors: {}, offset: offset.current, scale, seed, res, version }
			biomeMap(data, img, options).then(() => {
				ctx.putImageData(img, 0, 0)
				if (next) {
					clearTimeout(redrawTimeout.current)
					redrawTimeout.current = setTimeout(() => redraw.current(next), 150) as any
				}
			})
		}
		refocus.current = (x: number, y: number) => {
			const x2 = x * 200 / canvas.current.clientWidth
			const y2 = y * 200 / canvas.current.clientHeight
			const options = { biomeColors: {}, offset: offset.current, scale, seed, res: 1, version }
			getBiome(data, x2, y2, options).then(biome => setFocused(biome))
		}
	})

	useOnDrag(canvas.current, (dx, dy) => {
		const x = dx * 200 / canvas.current.clientWidth
		const y = dy * 200 / canvas.current.clientHeight
		offset.current = [offset.current[0] + x, offset.current[1] + y]
		redraw.current()
	})

	useOnHover(canvas.current, (x, y) => {
		if (x === undefined || y === undefined) {
			setFocused(undefined)
		} else {
			refocus.current(x, y)
		}
	})

	const state = JSON.stringify(data)
	useEffect(() => {
		if (shown) {
			redraw.current()
		}
	}, [state, scale, seed, shown])

	const changeScale = (newScale: number) => {
		offset.current[0] *= scale / newScale
		offset.current[1] *= scale / newScale
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

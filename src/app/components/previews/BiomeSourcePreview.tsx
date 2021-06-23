import type { DataModel } from '@mcschema/core'
import { useEffect, useRef, useState } from 'preact/hooks'
import { Btn } from '..'
import { useOnDrag, useOnHover } from '../../hooks'
import { biomeSource, getBiome } from '../../previews'
import { hexId } from '../../Utils'

type BiomeSourceProps = {
	lang: string,
	model: DataModel,
	data: any,
	shown: boolean,
}
export const BiomeSourcePreview = ({ data, shown }: BiomeSourceProps) => {
	const [scale, setScale] = useState(2)
	const [seed, setSeed] = useState(hexId())
	const [focused, setFocused] = useState<string | undefined>(undefined)
	const type: string = data.type?.replace(/^minecraft:/, '')

	const canvas = useRef<HTMLCanvasElement>(null)
	const offset = useRef<[number, number]>([0, 0])
	const redrawTimeout = useRef(undefined)
	const redraw = useRef<Function>()
	const refocus = useRef<Function>()

	useEffect(() => {
		redraw.current = (res = 4) => {
			if (type !== 'multi_noise') res = 1
			const ctx = canvas.current.getContext('2d')!
			canvas.current.width = 200 / res
			canvas.current.height = 200 / res
			const img = ctx.createImageData(canvas.current.width, canvas.current.height)
			biomeSource(data, img, { biomeColors: {}, offset: offset.current, scale, seed, res })
			ctx.putImageData(img, 0, 0)
			if (res !== 1) {
				clearTimeout(redrawTimeout.current)
				redrawTimeout.current = setTimeout(() => redraw.current(1), 150) as any
			}
		}
		refocus.current = (x: number, y: number) => {
			const x2 = x * 200 / canvas.current.clientWidth
			const y2 = y * 200 / canvas.current.clientHeight
			const biome = getBiome(data, x2, y2, { biomeColors: {}, offset: offset.current, scale, seed, res: 1 })
			setFocused(biome)
		}
	})

	useOnDrag(canvas.current, (dx, dy) => {
		const x = dx * canvas.current.width / canvas.current.clientWidth
		const y = dy * canvas.current.height / canvas.current.clientHeight
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
				<Btn icon="sync" onClick={() => setSeed(hexId())} />}
		</div>
		<canvas ref={canvas} width="200" height="200"></canvas>
	</>
}

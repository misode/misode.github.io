import { Path } from '@mcschema/core'
import type { NoiseOctaves } from 'deepslate'
import { NoiseGeneratorSettings } from 'deepslate'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { PreviewProps } from '.'
import { Btn } from '..'
import { useCanvas } from '../../hooks'
import { biomeMap, getBiome } from '../../previews'
import { newSeed } from '../../Utils'

export const BiomeSourcePreview = ({ model, data, shown, version }: PreviewProps) => {
	const [scale, setScale] = useState(2)
	const [focused, setFocused] = useState<string | undefined>(undefined)
	const offset = useRef<[number, number]>([0, 0])
	const res = useRef(1)
	const refineTimeout = useRef<number>(undefined)

	const seed = BigInt(model.get(new Path(['generator', 'seed'])))
	const octaves = getOctaves(model.get(new Path(['generator', 'settings'])))
	const state = calculateState(data, octaves)
	const type: string = data.type?.replace(/^minecraft:/, '')

	const { canvas, redraw } = useCanvas({
		size() {
			return [200 / res.current, 200 / res.current]
		},
		async draw(img) {
			const options = { octaves, biomeColors: {}, offset: offset.current, scale, seed, res: res.current, version }
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
			const options = { octaves, biomeColors: {}, offset: offset.current, scale, seed, res: 1, version }
			const biome = await getBiome(data, Math.floor(x * 200), Math.floor(y * 200), options)
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
				<Btn icon="sync" onClick={() => newSeed(model)} />}
		</div>
		<canvas ref={canvas} width="200" height="200"></canvas>
	</>
}

function calculateState(data: any, octaves: NoiseOctaves) {
	return JSON.stringify([data, octaves])
}

function getOctaves(obj: any): NoiseOctaves {
	if (typeof obj === 'string') {
		switch (obj.replace(/^minecraft:/, '')) {
			case 'overworld':
			case 'amplified':
				return {
					temperature: { firstOctave: -9, amplitudes: [1.5, 0, 1, 0, 0, 0] },
					humidity: { firstOctave: -7, amplitudes: [1, 1, 0, 0, 0, 0] },
					continentalness: { firstOctave: -9, amplitudes: [1, 1, 2, 2, 2, 1, 1, 1, 1] },
					erosion: { firstOctave: -9, amplitudes: [1, 1, 0, 1, 1] },
					weirdness: { firstOctave: -7, amplitudes: [1, 2, 1, 0, 0, 0] },
					shift: { firstOctave: -3, amplitudes: [1, 1, 1, 0] },
				}
			case 'end':
			case 'floating_islands':
				return {
					temperature: { firstOctave: 0, amplitudes: [0] },
					humidity: { firstOctave: 0, amplitudes: [0] },
					continentalness: { firstOctave: 0, amplitudes: [0] },
					erosion: { firstOctave: 0, amplitudes: [0] },
					weirdness: { firstOctave: 0, amplitudes: [0] },
					shift: { firstOctave: 0, amplitudes: [0] },
				}
			default:
				return {
					temperature: { firstOctave: -7, amplitudes: [1, 1] },
					humidity: { firstOctave: -7, amplitudes: [1, 1] },
					continentalness: { firstOctave: -7, amplitudes: [1, 1] },
					erosion: { firstOctave: -7, amplitudes: [1, 1] },
					weirdness: { firstOctave: -7, amplitudes: [1, 1] },
					shift: { firstOctave: 0, amplitudes: [0] },
				}
		}
	}
	return NoiseGeneratorSettings.fromJson(obj).octaves
}

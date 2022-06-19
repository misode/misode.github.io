import { DataModel, Path } from '@mcschema/core'
import { useEffect, useRef, useState } from 'preact/hooks'
import { useLocale, useProject, useStore } from '../../contexts/index.js'
import { useCanvas } from '../../hooks/index.js'
import { biomeMap, getBiome } from '../../previews/index.js'
import { newSeed, randomSeed } from '../../Utils.js'
import { Btn } from '../index.js'
import type { PreviewProps } from './index.js'

export const BiomeSourcePreview = ({ model, data, shown, version }: PreviewProps) => {
	const { locale } = useLocale()
	const { project } = useProject()
	const [configuredSeed] = useState(randomSeed())
	const [scale, setScale] = useState(2)
	const [focused, setFocused] = useState<{[k: string]: number | string} | undefined>(undefined)
	const { biomeColors } = useStore()
	const offset = useRef<[number, number]>([0, 0])
	const res = useRef(1)
	const refineTimeout = useRef<number>()

	const seed = BigInt(model.get(new Path(['generator', 'seed'])) ?? configuredSeed)
	const settings = DataModel.unwrapLists(model.get(new Path(['generator', 'settings'])))
	const state = JSON.stringify([data, settings])
	const type: string = data.type?.replace(/^minecraft:/, '')

	const { canvas, redraw } = useCanvas({
		size() {
			return [200 / res.current, 200 / res.current]
		},
		async draw(img) {
			const options = { settings, biomeColors, offset: offset.current, scale, seed, res: res.current, version, project }
			await biomeMap(data, img, options)
			if (res.current === 4) {
				clearTimeout(refineTimeout.current)
				refineTimeout.current = setTimeout(() => {
					res.current = 1
					redraw()
				}, 150) as any
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
			const options = { settings, biomeColors, offset: offset.current, scale, seed: configuredSeed, res: 1, version, project }
			const biome = await getBiome(data, Math.floor(x * 200), Math.floor(y * 200), options)
			setFocused(biome)
		},
		onLeave() {
			setFocused(undefined)
		},
	}, [version, state, scale, configuredSeed, biomeColors, project])

	useEffect(() => {
		if (shown) {
			res.current = type === 'multi_noise' ? 4 : 1
			redraw()
		}
	}, [version, state, scale, configuredSeed, shown, biomeColors, project])

	const changeScale = (newScale: number) => {
		offset.current[0] = offset.current[0] * scale / newScale
		offset.current[1] = offset.current[1] * scale / newScale
		setScale(newScale)
	}

	return <>
		<div class="controls preview-controls">
			{focused && <Btn label={focused.biome as string} class="no-pointer" />}
			{type !== 'fixed' && <>
				<Btn icon="dash" tooltip={locale('zoom_out')}
					onClick={() => changeScale(scale * 1.5)} />
				<Btn icon="plus" tooltip={locale('zoom_in')}
					onClick={() => changeScale(scale / 1.5)} />
			</>}
			{type === 'multi_noise' &&
				<Btn icon="sync" tooltip={locale('generate_new_seed')}
					onClick={() => newSeed(model)} />}
		</div>
		{focused?.temperature !== undefined && <div class="controls secondary-controls">
			<Btn class="no-pointer" label={Object.entries(focused)
				.filter(([k]) => k !== 'biome')
				.map(([k, v]) => `${k[0].toUpperCase()}: ${(v as number).toFixed(2)}`).join('  ')}/>
		</div>}
		<canvas ref={canvas} width="200" height="200"></canvas>
	</>
}

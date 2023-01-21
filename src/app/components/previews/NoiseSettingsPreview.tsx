import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { useLocale, useProject } from '../../contexts/index.js'
import { useCanvas } from '../../hooks/index.js'
import type { ColormapType } from '../../previews/Colormap.js'
import { getNoiseBlock, noiseSettings } from '../../previews/index.js'
import { CachedCollections, checkVersion } from '../../services/index.js'
import { Store } from '../../Store.js'
import { randomSeed } from '../../Utils.js'
import { Btn, BtnInput, BtnMenu } from '../index.js'
import { ColormapSelector } from './ColormapSelector.jsx'
import type { PreviewProps } from './index.js'

export const NoiseSettingsPreview = ({ data, shown, version }: PreviewProps) => {
	const { locale } = useLocale()
	const { project } = useProject()
	const [seed, setSeed] = useState(randomSeed())
	const [biome, setBiome] = useState('minecraft:plains')
	const [biomeScale, setBiomeScale] = useState(0.2)
	const [biomeDepth, setBiomeDepth] = useState(0.1)
	const [autoScroll, setAutoScroll] = useState(false)
	const [focused, setFocused] = useState<string[]>([])
	const [layer, setLayer] = useState('terrain')
	const [colormap, setColormap] = useState<ColormapType>(Store.getColormap() ?? 'viridis')
	const offset = useRef(0)
	const scrollInterval = useRef<number | undefined>(undefined)
	const state = JSON.stringify([data, biomeScale, biomeDepth])

	const size = data?.noise?.height ?? 256
	const { canvas, redraw } = useCanvas({
		size() {
			return [size, size]
		},
		async draw(img) {
			const options = { biome, biomeDepth, biomeScale, offset: offset.current, width: img.width, seed, version, project, colormap, minY: data?.noise?.min_y ?? 0, height: data?.noise?.height ?? 256, hardZero: true }
			await noiseSettings(data, img, options)
		},
		async onDrag(dx) {
			offset.current += dx * size
			redraw()
		},
		async onHover(x, y) {
			const worldX = Math.floor(x * size - offset.current)
			const worldY = size - Math.max(1, Math.ceil(y * size)) + (data?.noise?.min_y ?? 0)
			const block = getNoiseBlock(worldX, worldY)
			setFocused([block ? `Y=${worldY} (${block.getName().path})` : `Y=${worldY}`])
		},
		onLeave() {
			setFocused([])
		},
	}, [version, state, seed, project, shown, biome, biomeScale, biomeDepth, layer, colormap])

	useEffect(() => {
		if (scrollInterval.current) {
			clearInterval(scrollInterval.current)
		}
		if (shown) {
			(async () => {
				try {
					await redraw()
					if (autoScroll) {
						scrollInterval.current = setInterval(() => {
							offset.current -= 8
							redraw()
						}, 100) as any
					}
				} catch (e) {
					throw e
				}
			})()
		}
	}, [version, state, seed, project, shown, biome, biomeScale, biomeDepth, autoScroll, layer, colormap])

	const allBiomes = useMemo(() => CachedCollections?.get('worldgen/biome') ?? [], [version])

	return <>
		<div class="controls preview-controls">
			{focused.map(s => <Btn label={s} class="no-pointer" /> )}
			{layer === 'final_density' && <ColormapSelector value={colormap} onChange={setColormap} />}
			<BtnMenu icon="gear" tooltip={locale('terrain_settings')}>
				{checkVersion(version, undefined, '1.17') ? <>
					<BtnInput label={locale('preview.scale')} value={`${biomeScale}`} onChange={v => setBiomeScale(Number(v))} />
					<BtnInput label={locale('preview.depth')} value={`${biomeDepth}`} onChange={v => setBiomeDepth(Number(v))} />
				</> :
					<BtnInput label={locale('preview.biome')} value={biome} onChange={setBiome} dataList={allBiomes} larger />
				}
				<Btn icon={autoScroll ? 'square_fill' : 'square'} label={locale('preview.auto_scroll')} onClick={() => setAutoScroll(!autoScroll)} />
				<Btn icon={layer === 'final_density' ? 'square_fill' : 'square'} label={locale('preview.final_density')} onClick={() => setLayer(layer === 'final_density' ? 'terrain' : 'final_density')} />
			</BtnMenu>
			<Btn icon="sync" tooltip={locale('generate_new_seed')}
				onClick={() => setSeed(randomSeed())} />
		</div>
		<canvas ref={canvas} width={size} height={size}></canvas>
	</>
}

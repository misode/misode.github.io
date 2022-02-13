import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { PreviewProps } from '.'
import { Btn, BtnInput, BtnMenu } from '..'
import { useLocale } from '../../contexts'
import { useCanvas } from '../../hooks'
import { getNoiseBlock, noiseSettings } from '../../previews'
import { CachedCollections, checkVersion } from '../../services'
import { randomSeed } from '../../Utils'

export const NoiseSettingsPreview = ({ data, shown, version }: PreviewProps) => {
	const { locale } = useLocale()
	const [seed, setSeed] = useState(randomSeed())
	const [biome, setBiome] = useState('minecraft:plains')
	const [biomeScale, setBiomeScale] = useState(0.2)
	const [biomeDepth, setBiomeDepth] = useState(0.1)
	const [autoScroll, setAutoScroll] = useState(false)
	const [focused, setFocused] = useState<string | undefined>(undefined)
	const offset = useRef(0)
	const scrollInterval = useRef<number | undefined>(undefined)
	const state = JSON.stringify([data, biomeScale, biomeDepth])

	const size = data?.noise?.height ?? 256
	const { canvas, redraw } = useCanvas({
		size() {
			return [size, size]
		},
		async draw(img) {
			const options = { biome, biomeDepth, biomeScale, offset: offset.current, width: img.width, seed, version }
			noiseSettings(data, img, options)
		},
		async onDrag(dx) {
			offset.current += dx * size
			redraw()
		},
		async onHover(x, y) {
			const worldX = Math.floor(x * size - offset.current)
			const worldY = size - Math.max(1, Math.ceil(y * size)) + (data?.noise?.min_y ?? 0)
			const block = getNoiseBlock(worldX, worldY)
			setFocused(block ? `Y=${worldY} (${block.getName().replace(/^minecraft:/, '')})` : `Y=${worldY}`)
		},
		onLeave() {
			setFocused(undefined)
		},
	}, [state, seed])

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
	}, [state, seed, shown, biome, biomeScale, biomeDepth, autoScroll])

	const allBiomes = useMemo(() => CachedCollections?.get('worldgen/biome') ?? [], [version])

	return <>
		<div class="controls preview-controls">
			{focused && <Btn label={focused} class="no-pointer" />}
			<BtnMenu icon="gear" tooltip={locale('terrain_settings')}>
				{checkVersion(version, undefined, '1.17') ? <>
					<BtnInput label={locale('preview.scale')} value={`${biomeScale}`} onChange={v => setBiomeScale(Number(v))} />
					<BtnInput label={locale('preview.depth')} value={`${biomeDepth}`} onChange={v => setBiomeDepth(Number(v))} />
				</> :
					<BtnInput label={locale('preview.biome')} value={biome} onChange={setBiome} dataList={allBiomes} larger />
				}
				<Btn icon={autoScroll ? 'square_fill' : 'square'} label={locale('preview.auto_scroll')} onClick={() => setAutoScroll(!autoScroll)} />
			</BtnMenu>
			<Btn icon="sync" tooltip={locale('generate_new_seed')}
				onClick={() => setSeed(randomSeed())} />
		</div>
		<canvas ref={canvas} width={size} height={size}></canvas>
	</>
}

import { clampedMap } from 'deepslate'
import type { mat3 } from 'gl-matrix'
import { useCallback, useRef, useState } from 'preact/hooks'
import { getWorldgenProjectData, useLocale, useProject, useVersion } from '../../contexts/index.js'
import { useAsync } from '../../hooks/index.js'
import { checkVersion, fetchRegistries } from '../../services/index.js'
import { Store } from '../../Store.js'
import type { Color } from '../../Utils.js'
import { hexToRgb, iterateWorld2D, randomSeed, safeJsonParse } from '../../Utils.js'
import { Btn, BtnInput, BtnMenu, ErrorPanel } from '../index.js'
import type { ColormapType } from './Colormap.js'
import { getColormap } from './Colormap.js'
import { ColormapSelector } from './ColormapSelector.jsx'
import { Deepslate } from './Deepslate.js'
import type { PreviewProps } from './index.js'
import { InteractiveCanvas2D } from './InteractiveCanvas2D.jsx'

export const NoiseSettingsPreview = ({ docAndNode, shown }: PreviewProps) => {
	const { locale } = useLocale()
	const { version } = useVersion()
	const { project } = useProject()
	const [seed, setSeed] = useState(randomSeed())
	const [biome, setBiome] = useState('minecraft:plains')
	const [layer, setLayer] = useState('terrain')

	const text = docAndNode.doc.getText()

	const { value: deepslate } = useAsync(async () => {
		return Deepslate.load(version)
	}, [version])

	const { value, error } = useAsync(async () => {
		if (!deepslate) return undefined
		const data = safeJsonParse(text) ?? {}
		const projectData = await getWorldgenProjectData(project)
		deepslate.loadProjectData(projectData)
		const chunkGenerator = deepslate.initChunkGenerator(seed, data, biome)
		const finalDensity = checkVersion(version, '1.18.2') ? deepslate.initDensitySampler(seed, data?.noise_router?.final_density) : undefined
		return { chunkGenerator, finalDensity }
	}, [deepslate, version, text, seed, project, biome])
	const { chunkGenerator, finalDensity } = value ?? {}

	const imageData = useRef<ImageData>()
	const ctx = useRef<CanvasRenderingContext2D>()
	const [focused, setFocused] = useState<string[]>([])
	const [colormap, setColormap] = useState<ColormapType>(Store.getColormap() ?? 'viridis')

	const onSetup = useCallback((canvas: HTMLCanvasElement) => {
		const ctx2D = canvas.getContext('2d')
		if (!ctx2D) return
		ctx.current = ctx2D
	}, [])
	const onResize = useCallback((width: number, height: number) => {
		if (!ctx.current) return
		imageData.current = ctx.current.getImageData(0, 0, width, height)
	}, [])
	const onDraw = useCallback((transform: mat3) => {
		if (!ctx.current || !imageData.current || !shown) return

		if (layer === 'terrain') {
			if (!chunkGenerator) return
			iterateWorld2D(imageData.current, transform, (x, y) => {
				return chunkGenerator.getBlockState(x, y, 0)
			}, (block) => {
				return BlockColors[block] ?? [0, 0, 0]
			})
		} else if (layer === 'final_density') {
			if (!finalDensity) return
			const colormapFn = getColormap(colormap)
			const colorPicker = (t: number) => colormapFn(t <= 0.5 ? t - 0.08 : t + 0.08)
			iterateWorld2D(imageData.current, transform, (x, y) => {
				return finalDensity.sample(x, y, 0)
			}, (density) => {
				const color = colorPicker(clampedMap(density, -1, 1, 1, 0))
				return [color[0] * 256, color[1] * 256, color[2] * 256]
			})
		}
		ctx.current.putImageData(imageData.current, 0, 0)
	}, [chunkGenerator, finalDensity, layer, colormap, biome, shown])
	const onHover = useCallback((pos: [number, number] | undefined) => {
		if (!pos || !chunkGenerator || !finalDensity) {
			setFocused([])
		} else {
			const [x, y] = pos
			const density = finalDensity.sample(x, -y, 0)
			const block = chunkGenerator.getBlockState(x, -y, 0).replace(/^minecraft:/, '')
			setFocused([`${block} D=${density.toPrecision(3)}`, `X=${x} Y=${-y}`])
		}
	}, [chunkGenerator, finalDensity])

	const { value: allBiomes } = useAsync(async () => {
		const registries = await fetchRegistries(version)
		return registries.get('worldgen/biome')
	}, [version])

	if (error) {
		return <ErrorPanel error={error} prefix="Failed to initialize preview: " />
	}

	return <>
		<div class="controls preview-controls">
			{focused.map(s => <Btn label={s} class="no-pointer" /> )}
			{layer === 'final_density' && <ColormapSelector value={colormap} onChange={setColormap} />}
			<BtnMenu icon="gear" tooltip={locale('terrain_settings')}>
				<BtnInput label={locale('preview.biome')} value={biome} onChange={setBiome} dataList={allBiomes} larger />
				<Btn icon={layer === 'final_density' ? 'square_fill' : 'square'} label={locale('preview.final_density')} onClick={() => setLayer(layer === 'final_density' ? 'terrain' : 'final_density')} />
			</BtnMenu>
			<Btn icon="sync" tooltip={locale('generate_new_seed')}
				onClick={() => setSeed(randomSeed())} />
		</div>
		<div class="full-preview">
			<InteractiveCanvas2D onSetup={onSetup} onResize={onResize} onDraw={onDraw} onHover={onHover} pixelSize={4} startScale={0.5} startPosition={[0, 64]} />
		</div>
	</>
}

const BlockColors: Record<string, Color> = {
	'minecraft:air': hexToRgb('#96a0aa'),
	'minecraft:water': hexToRgb('#1450aa'),
	'minecraft:lava': hexToRgb('#c86400'),
	'minecraft:stone': hexToRgb('#686868'),
	'minecraft:deepslate': hexToRgb('#2f2f36'),
	'minecraft:bedrock': hexToRgb('#0a0a0a'),
	'minecraft:grass_block': hexToRgb('#2f7817'),
	'minecraft:dirt': hexToRgb('#71563e'),
	'minecraft:coarse_dirt': hexToRgb('#684f39'),
	'minecraft:podzol': hexToRgb('#4d3d1e'),
	'minecraft:mycelium': hexToRgb('#675e62'),
	'minecraft:mud': hexToRgb('#3c3836'),
	'minecraft:gravel': hexToRgb('#464646'),
	'minecraft:sand': hexToRgb('#c4b44d'),
	'minecraft:sandstone': hexToRgb('#948734'),
	'minecraft:snow_block': hexToRgb('#ffffff'),
	'minecraft:powder_snow': hexToRgb('#f0fbfb'),
	'minecraft:ice': hexToRgb('#7c8fbe'),
	'minecraft:packed_ice': hexToRgb('#93aef2'),
	'minecraft:calcite': hexToRgb('#d9dbd7'),
	'minecraft:sulfur': hexToRgb('#bdb275'),
	'minecraft:cinnabar': hexToRgb('#884f45'),
	'minecraft:red_sand': hexToRgb('#ae6b33'),
	'minecraft:red_sandstone': hexToRgb('#9c5b26'),
	'minecraft:terracotta': hexToRgb('#8a6048'),
	'minecraft:orange_terracotta': hexToRgb('#915730'),
	'minecraft:white_terracotta': hexToRgb('#c7b0a1'),
	'minecraft:netherrack': hexToRgb('#642828'),
	'minecraft:crimson_nylium': hexToRgb('#901616'),
	'minecraft:warped_nylium': hexToRgb('#1c7371'),
	'minecraft:basalt': hexToRgb('#32333c'),
	'minecraft:blackstone': hexToRgb('#26221d'),
	'minecraft:soul_sand': hexToRgb('#45382e'),
	'minecraft:soul_soil': hexToRgb('#3a2f26'),
	'minecraft:end_stone': hexToRgb('#c8c88c'),
}

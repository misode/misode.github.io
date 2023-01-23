import { DataModel } from '@mcschema/core'
import { clampedMap } from 'deepslate'
import { mat3 } from 'gl-matrix'
import { useCallback, useRef, useState } from 'preact/hooks'
import { getProjectData, useLocale, useProject, useStore } from '../../contexts/index.js'
import { useAsync } from '../../hooks/index.js'
import { checkVersion } from '../../services/Schemas.js'
import { Store } from '../../Store.js'
import { iterateWorld2D, randomSeed, stringToColor } from '../../Utils.js'
import { Btn, BtnMenu, NumberInput } from '../index.js'
import type { ColormapType } from './Colormap.js'
import { getColormap } from './Colormap.js'
import { ColormapSelector } from './ColormapSelector.jsx'
import { DEEPSLATE } from './Deepslate.js'
import type { PreviewProps } from './index.js'
import { InteractiveCanvas2D } from './InteractiveCanvas2D.jsx'

const LAYERS = ['biomes', 'temperature', 'vegetation', 'continents', 'erosion', 'ridges', 'depth'] as const
type Layer = typeof LAYERS[number]

const DETAIL_DELAY = 300
const DETAIL_SCALE = 2

export const BiomeSourcePreview = ({ data, shown, version }: PreviewProps) => {
	const { locale } = useLocale()
	const { project } = useProject()
	const { biomeColors } = useStore()
	const [seed, setSeed] = useState(randomSeed())
	const [layer, setLayer] = useState<Layer>('biomes')
	const [yOffset, setYOffset] = useState(64)
	const [focused, setFocused] = useState<string[]>([])
	const [focused2, setFocused2] = useState<string[]>([])

	const state = JSON.stringify(data)
	const type: string = data?.generator?.biome_source?.type?.replace(/^minecraft:/, '') ?? ''
	const hasRandomness = type === 'multi_noise' || type === 'the_end'

	const { value } = useAsync(async function loadBiomeSource() {
		await DEEPSLATE.loadVersion(version, getProjectData(project))
		await DEEPSLATE.loadChunkGenerator(DataModel.unwrapLists(data?.generator?.settings), DataModel.unwrapLists(data?.generator?.biome_source), seed)
		return {
			biomeSource: { loaded: true },
			noiseRouter: checkVersion(version, '1.19') ? DEEPSLATE.getNoiseRouter() : undefined,
		}
	}, [state, seed, project, version])
	const { biomeSource, noiseRouter } = value ?? {}

	const actualLayer = noiseRouter ? layer : 'biomes'

	const ctx = useRef<CanvasRenderingContext2D>()
	const imageData = useRef<ImageData>()
	const [colormap, setColormap] = useState<ColormapType>(Store.getColormap() ?? 'viridis')

	const detailCanvas = useRef<HTMLCanvasElement>(null)
	const detailCtx = useRef<CanvasRenderingContext2D>()
	const detailImageData = useRef<ImageData>()
	const detailTimeout = useRef<number>()
	
	const onSetup = useCallback(function onSetup(canvas: HTMLCanvasElement) {
		ctx.current = canvas.getContext('2d') ?? undefined
		detailCtx.current = detailCanvas.current?.getContext('2d') ?? undefined
	}, [])
	const onResize = useCallback(function onResize(width: number, height: number) {
		if (ctx.current) {
			imageData.current = ctx.current.getImageData(0, 0, width, height)
		}
		if (detailCtx.current && detailCanvas.current) {
			detailCanvas.current.width = width * DETAIL_SCALE
			detailCanvas.current.height = height * DETAIL_SCALE
			detailImageData.current = detailCtx.current.getImageData(0, 0, width * DETAIL_SCALE, height * DETAIL_SCALE)
		}
	}, [])
	const onDraw = useCallback(function onDraw(transform: mat3) {
		if (!ctx.current || !imageData.current || !shown) return

		function actualDraw(ctx: CanvasRenderingContext2D, img: ImageData, transform: mat3) {
			if (actualLayer === 'biomes' && biomeSource) {
				iterateWorld2D(img, transform, (x, y) => {
					return DEEPSLATE.getBiome(x, yOffset, y)
				}, (biome) => {
					return getBiomeColor(biome, biomeColors)
				})
			} else if (actualLayer !== 'biomes' && noiseRouter) {
				const df = noiseRouter[actualLayer]
				const colorPicker = getColormap(colormap)
				iterateWorld2D(img, transform, (x, y) => {
					return df.compute({ x: x*4, y: yOffset, z: y*4 }) ?? 0
				}, (density) => {
					const color = colorPicker(clampedMap(density, -1, 1, 0, 1))
					return [color[0] * 256, color[1] * 256, color[2] * 256]
				})
			}
			ctx.putImageData(img, 0, 0)
		}

		actualDraw(ctx.current, imageData.current, transform)
		detailCanvas.current?.classList.remove('visible')

		clearTimeout(detailTimeout.current)
		if (hasRandomness) {
			detailTimeout.current = setTimeout(function detailTimout() {
				if (!detailCtx.current || !detailImageData.current || !detailCanvas.current) return
				const detailTransform = mat3.create()
				mat3.scale(detailTransform, transform, [1/DETAIL_SCALE, 1/DETAIL_SCALE])
				actualDraw(detailCtx.current, detailImageData.current, detailTransform)
				detailCanvas.current.classList.add('visible')
			}, DETAIL_DELAY) as unknown as number
		}
	}, [biomeSource, noiseRouter, actualLayer, colormap, shown, biomeColors, yOffset])
	const onHover = useCallback(function onHover(pos: [number, number] | undefined) {
		const [x, y] = pos ?? [0, 0]
		if (!pos || !biomeSource) {
			setFocused([])
		} else {
			const biome = DEEPSLATE.getBiome(x, yOffset, -y)
			setFocused([biome.replace(/^minecraft:/, ''), `X=${x*4} Z=${-y*4}`])
		}
		if (!pos || !noiseRouter) {
			setFocused2([])
		} else {
			setFocused2([LAYERS.flatMap(l => {
				if (l === 'biomes') return []
				const value = noiseRouter[l].compute({ x: x*4, y: yOffset, z: -y*4 })
				return [`${locale(`layer.${l}`).charAt(0)}=${value.toPrecision(2)}`]
			}).join(' ')])
		}
	}, [biomeSource, noiseRouter, yOffset])

	return <>
		{(hasRandomness && focused2) && <div class="controls secondary-controls">
			{focused2.map(s => <Btn label={s} class="no-pointer" /> )}
		</div>}
		<div class="controls preview-controls">
			{focused.map(s => <Btn label={s} class="no-pointer" /> )}
			{actualLayer !== 'biomes' && <ColormapSelector value={colormap} onChange={setColormap} />}
			{hasRandomness && <>
				<BtnMenu icon="stack" tooltip={locale('layer')}>
					<div class="btn btn-input" onClick={e => e.stopPropagation()}>
						<span>{locale('y')}</span>
						<NumberInput value={yOffset} onChange={setYOffset} />
					</div>
					{checkVersion(version, '1.19') && LAYERS.map(l => <Btn label={locale(`layer.${l}`)} active={l === actualLayer} onClick={() => setLayer(l)} />)}
				</BtnMenu>
				<Btn icon="sync" tooltip={locale('generate_new_seed')}
					onClick={() => setSeed(randomSeed())} />
			</>}
		</div>
		<div class="full-preview">
			<InteractiveCanvas2D onSetup={onSetup} onResize={onResize} onDraw={onDraw} onHover={onHover} pixelSize={hasRandomness ? 8 : 2} />
			{hasRandomness && <canvas class={'preview-details'} ref={detailCanvas} />}
		</div>
	</>
}

type Triple = [number, number, number]
type BiomeColors = Record<string, Triple>
function getBiomeColor(biome: string, biomeColors: BiomeColors): Triple {
	if (!biome) {
		return [128, 128, 128]
	}
	const color = biomeColors[biome] ?? VanillaColors[biome]
	if (color === undefined) {
		return stringToColor(biome)
	}
	return color
}

export const VanillaColors: Record<string, Triple> = {
	'minecraft:badlands': [217,69,21],
	'minecraft:badlands_plateau': [202,140,101],
	'minecraft:bamboo_jungle': [118,142,20],
	'minecraft:bamboo_jungle_hills': [59,71,10],
	'minecraft:basalt_deltas': [64,54,54],
	'minecraft:beach': [250,222,85],
	'minecraft:birch_forest': [48,116,68],
	'minecraft:birch_forest_hills': [31,95,50],
	'minecraft:cold_ocean': [32,32,112],
	'minecraft:crimson_forest': [221,8,8],
	'minecraft:dark_forest': [64,81,26],
	'minecraft:dark_forest_hills': [104,121,66],
	'minecraft:deep_cold_ocean': [32,32,56],
	'minecraft:deep_frozen_ocean': [64,64,144],
	'minecraft:deep_lukewarm_ocean': [0,0,64],
	'minecraft:deep_ocean': [0,0,48],
	'minecraft:deep_warm_ocean': [0,0,80],
	'minecraft:desert': [250,148,24],
	'minecraft:desert_hills': [210,95,18],
	'minecraft:desert_lakes': [255,188,64],
	'minecraft:end_barrens': [39,30,61],
	'minecraft:end_highlands': [232,244,178],
	'minecraft:end_midlands': [194,187,136],
	'minecraft:eroded_badlands': [255,109,61],
	'minecraft:flower_forest': [45,142,73],
	'minecraft:forest': [5,102,33],
	'minecraft:frozen_ocean': [112,112,214],
	'minecraft:frozen_river': [160,160,255],
	'minecraft:giant_spruce_taiga': [129,142,121],
	'minecraft:old_growth_spruce_taiga': [129,142,121],
	'minecraft:giant_spruce_taiga_hills': [109,119,102],
	'minecraft:giant_tree_taiga': [89,102,81],
	'minecraft:old_growth_pine_taiga': [89,102,81],
	'minecraft:giant_tree_taiga_hills': [69,79,62],
	'minecraft:gravelly_hills': [136,136,136],
	'minecraft:gravelly_mountains': [136,136,136],
	'minecraft:windswept_gravelly_hills': [136,136,136],
	'minecraft:ice_spikes': [180,220,220],
	'minecraft:jungle': [83,123,9],
	'minecraft:jungle_edge': [98,139,23],
	'minecraft:sparse_jungle': [98,139,23],
	'minecraft:jungle_hills': [44,66,5],
	'minecraft:lukewarm_ocean': [0,0,144],
	'minecraft:modified_badlands_plateau': [242,180,141],
	'minecraft:modified_gravelly_mountains': [120,152,120],
	'minecraft:modified_jungle': [123,163,49],
	'minecraft:modified_jungle_edge': [138,179,63],
	'minecraft:modified_wooded_badlands_plateau': [216,191,141],
	'minecraft:mountain_edge': [114,120,154],
	'minecraft:extreme_hills': [96,96,96],
	'minecraft:mountains': [96,96,96],
	'minecraft:windswept_hills': [96,96,96],
	'minecraft:mushroom_field_shore': [160,0,255],
	'minecraft:mushroom_fields': [255,0,255],
	'minecraft:nether_wastes': [191,59,59],
	'minecraft:ocean': [0,0,112],
	'minecraft:plains': [141,179,96],
	'minecraft:river': [0,0,255],
	'minecraft:savanna': [189,178,95],
	'minecraft:savanna_plateau': [167,157,100],
	'minecraft:shattered_savanna': [229,218,135],
	'minecraft:windswept_savanna': [229,218,135],
	'minecraft:shattered_savanna_plateau': [207,197,140],
	'minecraft:small_end_islands': [16,12,28],
	'minecraft:snowy_beach': [250,240,192],
	'minecraft:snowy_mountains': [160,160,160],
	'minecraft:snowy_taiga': [49,85,74],
	'minecraft:snowy_taiga_hills': [36,63,54],
	'minecraft:snowy_taiga_mountains': [89,125,114],
	'minecraft:snowy_tundra': [255,255,255],
	'minecraft:snowy_plains': [255,255,255],
	'minecraft:soul_sand_valley': [94,56,48],
	'minecraft:stone_shore': [162,162,132],
	'minecraft:stony_shore': [162,162,132],
	'minecraft:sunflower_plains': [181,219,136],
	'minecraft:swamp': [7,249,178],
	'minecraft:swamp_hills': [47,255,218],
	'minecraft:taiga': [11,102,89],
	'minecraft:taiga_hills': [22,57,51],
	'minecraft:taiga_mountains': [51,142,129],
	'minecraft:tall_birch_forest': [88,156,108],
	'minecraft:old_growth_birch_forest': [88,156,108],
	'minecraft:tall_birch_hills': [71,135,90],
	'minecraft:the_end': [59,39,84],
	'minecraft:the_void': [0,0,0],
	'minecraft:warm_ocean': [0,0,172],
	'minecraft:warped_forest': [73,144,123],
	'minecraft:wooded_badlands_plateau': [176,151,101],
	'minecraft:wooded_badlands': [176,151,101],
	'minecraft:wooded_hills': [34,85,28],
	'minecraft:wooded_mountains': [80,112,80],
	'minecraft:windswept_forest': [80,112,80],
	'minecraft:snowy_slopes': [140, 195, 222],
	'minecraft:lofty_peaks': [196, 168, 193],
	'minecraft:jagged_peaks': [196, 168, 193],
	'minecraft:snowcapped_peaks': [200, 198, 200],
	'minecraft:frozen_peaks': [200, 198, 200],
	'minecraft:stony_peaks': [82, 92, 103],
	'minecraft:grove': [150, 150, 189],
	'minecraft:meadow': [169, 197, 80],
	'minecraft:lush_caves': [112, 255, 79],
	'minecraft:dripstone_caves': [140, 124, 0],
	'minecraft:deep_dark': [10, 14, 19],
	'minecraft:mangrove_swamp': [36,196,142],
}

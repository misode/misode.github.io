import { mat3 } from 'gl-matrix'
import { useCallback, useRef, useState } from 'preact/hooks'
import { getWorldgenProjectData, useLocale, useProject, useStore, useVersion } from '../../contexts/index.js'
import { useAsync } from '../../hooks/index.js'
import type { Color } from '../../Utils.js'
import { hexToRgb, iterateWorld2D, randomSeed, safeJsonParse, stringToColor } from '../../Utils.js'
import { ErrorPanel } from '../ErrorPanel.jsx'
import { Btn, BtnMenu, NumberInput } from '../index.js'
import { Deepslate } from './Deepslate.js'
import type { PreviewProps } from './index.js'
import { InteractiveCanvas2D } from './InteractiveCanvas2D.jsx'

const DETAIL_DELAY = 300
const DETAIL_SCALE = 2

export const BiomeSourcePreview = ({ docAndNode, shown }: PreviewProps) => {
	const { locale } = useLocale()
	const { version } = useVersion()
	const { project } = useProject()
	const { biomeColors } = useStore()
	const [seed, setSeed] = useState(randomSeed())
	const [yOffset, setYOffset] = useState(64)
	const [focused, setFocused] = useState<string[]>([])

	const text = docAndNode.doc.getText()
	const data = safeJsonParse(text) ?? {}
	const type: string = data?.generator?.biome_source?.type?.replace(/^minecraft:/, '') ?? ''
	const hasRandomness = type === 'multi_noise' || type === 'the_end'

	const { value: deepslate } = useAsync(async () => {
		return Deepslate.load(version)
	}, [version])

	const { value: biomeSource, error: biomeError } = useAsync(async function loadBiomeSource() {
		if (!deepslate) return undefined
		const projectData = await getWorldgenProjectData(project)
		deepslate.loadProjectData(projectData)
		return deepslate.initBiomeSampler(seed, data?.generator?.settings, data?.generator?.biome_source)
	}, [deepslate, text, seed, project])

	const ctx = useRef<CanvasRenderingContext2D>()
	const imageData = useRef<ImageData>()

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
			if (!biomeSource) return
			iterateWorld2D(img, transform, (x, y) => {
				return biomeSource.sample(x, yOffset, y)
			}, (biome) => {
				return getBiomeColor(biome, biomeColors)
			})
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
	}, [biomeSource, shown, biomeColors, yOffset])
	const onHover = useCallback(function onHover(pos: [number, number] | undefined) {
		const [x, y] = pos ?? [0, 0]
		if (!pos || !biomeSource) {
			setFocused([])
		} else {
			const biome = biomeSource.sample(x, yOffset, -y)
			setFocused([biome.replace(/^minecraft:/, ''), `X=${x*4} Z=${-y*4}`])
		}
	}, [biomeSource, yOffset])

	if (biomeError) {
		return <ErrorPanel error={biomeError} prefix="Failed to initialize biome source: " />
	}

	return <>
		<div class="controls preview-controls">
			{focused.map(s => <Btn label={s} class="no-pointer" /> )}
			{hasRandomness && <>
				<BtnMenu icon="stack" tooltip={locale('layer')}>
					<div class="btn btn-input" onClick={e => e.stopPropagation()}>
						<span>{locale('y')}</span>
						<NumberInput value={yOffset} onChange={setYOffset} />
					</div>
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

type BiomeColors = Record<string, Color>
function getBiomeColor(biome: string, biomeColors: BiomeColors): Color {
	if (!biome) {
		return [128, 128, 128]
	}
	const color = biomeColors[biome] ?? VanillaColors[biome]
	if (color === undefined) {
		return stringToColor(biome)
	}
	return color
}

export const VanillaColors: Record<string, Color> = {
	'minecraft:badlands': hexToRgb('#d94515'),
	'minecraft:badlands_plateau': hexToRgb('#ca8c65'),
	'minecraft:bamboo_jungle': hexToRgb('#768e14'),
	'minecraft:bamboo_jungle_hills': hexToRgb('#3b470a'),
	'minecraft:basalt_deltas': hexToRgb('#403636'),
	'minecraft:beach': hexToRgb('#fade55'),
	'minecraft:birch_forest': hexToRgb('#307444'),
	'minecraft:birch_forest_hills': hexToRgb('#1f5f32'),
	'minecraft:cold_ocean': hexToRgb('#202070'),
	'minecraft:crimson_forest': hexToRgb('#dd0808'),
	'minecraft:dark_forest': hexToRgb('#40511a'),
	'minecraft:dark_forest_hills': hexToRgb('#687942'),
	'minecraft:deep_cold_ocean': hexToRgb('#202038'),
	'minecraft:deep_frozen_ocean': hexToRgb('#404090'),
	'minecraft:deep_lukewarm_ocean': hexToRgb('#000040'),
	'minecraft:deep_ocean': hexToRgb('#000030'),
	'minecraft:deep_warm_ocean': hexToRgb('#000050'),
	'minecraft:desert': hexToRgb('#fa9418'),
	'minecraft:desert_hills': hexToRgb('#d25f12'),
	'minecraft:desert_lakes': hexToRgb('#ffbc40'),
	'minecraft:end_barrens': hexToRgb('#271e3d'),
	'minecraft:end_highlands': hexToRgb('#e8f4b2'),
	'minecraft:end_midlands': hexToRgb('#c2bb88'),
	'minecraft:eroded_badlands': hexToRgb('#ff6d3d'),
	'minecraft:flower_forest': hexToRgb('#2d8e49'),
	'minecraft:forest': hexToRgb('#056621'),
	'minecraft:frozen_ocean': hexToRgb('#7070d6'),
	'minecraft:frozen_river': hexToRgb('#a0a0ff'),
	'minecraft:giant_spruce_taiga': hexToRgb('#818e79'),
	'minecraft:old_growth_spruce_taiga': hexToRgb('#818e79'),
	'minecraft:giant_spruce_taiga_hills': hexToRgb('#6d7766'),
	'minecraft:giant_tree_taiga': hexToRgb('#596651'),
	'minecraft:old_growth_pine_taiga': hexToRgb('#596651'),
	'minecraft:giant_tree_taiga_hills': hexToRgb('#454f3e'),
	'minecraft:gravelly_hills': hexToRgb('#888888'),
	'minecraft:gravelly_mountains': hexToRgb('#888888'),
	'minecraft:windswept_gravelly_hills': hexToRgb('#888888'),
	'minecraft:ice_spikes': hexToRgb('#b4dcdc'),
	'minecraft:jungle': hexToRgb('#537b09'),
	'minecraft:jungle_edge': hexToRgb('#628b17'),
	'minecraft:sparse_jungle': hexToRgb('#628b17'),
	'minecraft:jungle_hills': hexToRgb('#2c4205'),
	'minecraft:lukewarm_ocean': hexToRgb('#000090'),
	'minecraft:modified_badlands_plateau': hexToRgb('#f2b48d'),
	'minecraft:modified_gravelly_mountains': hexToRgb('#789878'),
	'minecraft:modified_jungle': hexToRgb('#7ba331'),
	'minecraft:modified_jungle_edge': hexToRgb('#8ab33f'),
	'minecraft:modified_wooded_badlands_plateau': hexToRgb('#d8bf8d'),
	'minecraft:mountain_edge': hexToRgb('#72789a'),
	'minecraft:extreme_hills': hexToRgb('#606060'),
	'minecraft:mountains': hexToRgb('#606060'),
	'minecraft:windswept_hills': hexToRgb('#606060'),
	'minecraft:mushroom_field_shore': hexToRgb('#a000ff'),
	'minecraft:mushroom_fields': hexToRgb('#ff00ff'),
	'minecraft:nether_wastes': hexToRgb('#bf3b3b'),
	'minecraft:ocean': hexToRgb('#000070'),
	'minecraft:plains': hexToRgb('#8db360'),
	'minecraft:river': hexToRgb('#0000ff'),
	'minecraft:savanna': hexToRgb('#bdb25f'),
	'minecraft:savanna_plateau': hexToRgb('#a79d64'),
	'minecraft:shattered_savanna': hexToRgb('#e5da87'),
	'minecraft:windswept_savanna': hexToRgb('#e5da87'),
	'minecraft:shattered_savanna_plateau': hexToRgb('#cfc58c'),
	'minecraft:small_end_islands': hexToRgb('#100c1c'),
	'minecraft:snowy_beach': hexToRgb('#faf0c0'),
	'minecraft:snowy_mountains': hexToRgb('#a0a0a0'),
	'minecraft:snowy_taiga': hexToRgb('#31554a'),
	'minecraft:snowy_taiga_hills': hexToRgb('#243f36'),
	'minecraft:snowy_taiga_mountains': hexToRgb('#597d72'),
	'minecraft:snowy_tundra': hexToRgb('#ffffff'),
	'minecraft:snowy_plains': hexToRgb('#ffffff'),
	'minecraft:soul_sand_valley': hexToRgb('#5e3830'),
	'minecraft:stone_shore': hexToRgb('#a2a284'),
	'minecraft:stony_shore': hexToRgb('#a2a284'),
	'minecraft:sunflower_plains': hexToRgb('#b7dc89'),
	'minecraft:swamp': hexToRgb('#07f9b2'),
	'minecraft:swamp_hills': hexToRgb('#2fffda'),
	'minecraft:taiga': hexToRgb('#0b6659'),
	'minecraft:taiga_hills': hexToRgb('#163933'),
	'minecraft:taiga_mountains': hexToRgb('#338e81'),
	'minecraft:tall_birch_forest': hexToRgb('#589c6c'),
	'minecraft:old_growth_birch_forest': hexToRgb('#589c6c'),
	'minecraft:tall_birch_hills': hexToRgb('#47875a'),
	'minecraft:the_end': hexToRgb('#3b2754'),
	'minecraft:the_void': hexToRgb('#000000'),
	'minecraft:warm_ocean': hexToRgb('#0000ac'),
	'minecraft:warped_forest': hexToRgb('#49907b'),
	'minecraft:wooded_badlands_plateau': hexToRgb('#b09765'),
	'minecraft:wooded_badlands': hexToRgb('#b09765'),
	'minecraft:wooded_hills': hexToRgb('#22551c'),
	'minecraft:wooded_mountains': hexToRgb('#507050'),
	'minecraft:windswept_forest': hexToRgb('#507050'),
	'minecraft:snowy_slopes': hexToRgb('#8cc3de'),
	'minecraft:lofty_peaks': hexToRgb('#c4a8c1'),
	'minecraft:jagged_peaks': hexToRgb('#c4a8c1'),
	'minecraft:snowcapped_peaks': hexToRgb('#c8c6c8'),
	'minecraft:frozen_peaks': hexToRgb('#c8c6c8'),
	'minecraft:stony_peaks': hexToRgb('#525c67'),
	'minecraft:grove': hexToRgb('#9696bd'),
	'minecraft:meadow': hexToRgb('#a9c550'),
	'minecraft:lush_caves': hexToRgb('#70ff4f'),
	'minecraft:dripstone_caves': hexToRgb('#8c7c00'),
	'minecraft:deep_dark': hexToRgb('#0a0e13'),
	'minecraft:mangrove_swamp': hexToRgb('#24c48e'),
	'minecraft:cherry_grove': hexToRgb('#e1abcb'),
	'minecraft:pale_garden': hexToRgb('#7b8078'),
	'minecraft:sulfur_caves': hexToRgb('#bdb275'),
	'minecraft:dappled_forest': hexToRgb('#bf632d'),
}

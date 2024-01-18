import { DataModel } from '@mcschema/core'
import { clampedMap } from 'deepslate'
import type { mat3 } from 'gl-matrix'
import { vec2 } from 'gl-matrix'
import { useCallback, useMemo, useRef, useState } from 'preact/hooks'
import { Store } from '../../Store.js'
import { iterateWorld2D, randomSeed } from '../../Utils.js'
import { getProjectData, useLocale, useProject } from '../../contexts/index.js'
import { useAsync } from '../../hooks/index.js'
import { CachedCollections } from '../../services/index.js'
import { Btn, BtnInput, BtnMenu, ErrorPanel } from '../index.js'
import type { ColormapType } from './Colormap.js'
import { getColormap } from './Colormap.js'
import { ColormapSelector } from './ColormapSelector.jsx'
import { DEEPSLATE } from './Deepslate.js'
import { InteractiveCanvas2D } from './InteractiveCanvas2D.jsx'
import type { PreviewProps } from './index.js'

export const NoiseSettingsPreview = ({ data, shown, version }: PreviewProps) => {
	const { locale } = useLocale()
	const { project } = useProject()
	const [seed, setSeed] = useState(randomSeed())
	const [biome, setBiome] = useState('minecraft:plains')
	const [layer, setLayer] = useState('terrain')
	const state = JSON.stringify(data)

	const { value, error } = useAsync(async () => {
		const unwrapped = DataModel.unwrapLists(data)
		await DEEPSLATE.loadVersion(version, getProjectData(project))
		const biomeSource = { type: 'fixed', biome }
		await DEEPSLATE.loadChunkGenerator(unwrapped, biomeSource, seed)
		const noiseSettings = DEEPSLATE.getNoiseSettings()
		const finalDensity = DEEPSLATE.loadDensityFunction(unwrapped?.noise_router?.final_density, noiseSettings.minY, noiseSettings.height, seed)
		return { noiseSettings, finalDensity }
	}, [state, seed, version, project, biome])
	const { noiseSettings, finalDensity } = value ?? {}

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
			const pos = vec2.create()
			const minX = vec2.transformMat3(pos, vec2.fromValues(0, 0), transform)[0]
			const maxX = vec2.transformMat3(pos, vec2.fromValues(imageData.current.width-1, 0), transform)[0]
			DEEPSLATE.generateChunks(minX, maxX - minX + 1, biome)
			iterateWorld2D(imageData.current, transform, (x, y) => {
				return DEEPSLATE.getBlockState(x, y)?.getName().toString()
			}, (block) => {
				return BlockColors[block ?? 'minecraft:air'] ?? [0, 0, 0]
			})
		} else if (layer === 'final_density') {
			const colormapFn = getColormap(colormap)
			const colorPicker = (t: number) => colormapFn(t <= 0.5 ? t - 0.08 : t + 0.08)
			iterateWorld2D(imageData.current, transform, (x, y) => {
				return finalDensity?.compute({ x, y, z: 0 }) ?? 0
			}, (density) => {
				const color = colorPicker(clampedMap(density, -1, 1, 1, 0))
				return [color[0] * 256, color[1] * 256, color[2] * 256]
			})
		}
		ctx.current.putImageData(imageData.current, 0, 0)
	}, [noiseSettings, finalDensity, layer, colormap, biome, shown])
	const onHover = useCallback((pos: [number, number] | undefined) => {
		if (!pos || !noiseSettings || !finalDensity) {
			setFocused([])
		} else {
			const [x, y] = pos
			const inVoid = -y < noiseSettings.minY || -y >= noiseSettings.minY + noiseSettings.height
			const density = finalDensity.compute({ x, y: -y, z: 0})
			const block = inVoid ? 'void' : DEEPSLATE.getBlockState(x, -y)?.getName().path ?? 'unknown'
			setFocused([`${block} D=${density.toPrecision(3)}`, `X=${x} Y=${-y}`])
		}
	}, [noiseSettings, finalDensity])

	const allBiomes = useMemo(() => CachedCollections?.get('worldgen/biome') ?? [], [version])

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

const BlockColors: Record<string, [number, number, number]> = {
	'minecraft:air': [150, 160, 170],
	'minecraft:water': [20, 80, 170],
	'minecraft:lava': [200, 100, 0],
	'minecraft:stone': [55, 55, 55],
	'minecraft:deepslate': [34, 34, 36],
	'minecraft:bedrock': [10, 10, 10],
	'minecraft:grass_block': [47, 120, 23],
	'minecraft:dirt': [64, 40, 8],
	'minecraft:gravel': [70, 70, 70],
	'minecraft:sand': [196, 180, 77],
	'minecraft:sandstone': [148, 135, 52],
	'minecraft:netherrack': [100, 40, 40],
	'minecraft:crimson_nylium': [144, 22, 22],
	'minecraft:warped_nylium': [28, 115, 113],
	'minecraft:basalt': [73, 74, 85],
	'minecraft:end_stone': [200, 200, 140],
}

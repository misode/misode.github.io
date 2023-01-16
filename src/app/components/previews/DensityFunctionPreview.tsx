import { VoxelRenderer } from 'deepslate/render'
import { useEffect, useRef, useState } from 'preact/hooks'
import { useLocale, useProject, useVersion } from '../../contexts/index.js'
import { useCanvas, useCanvas3D } from '../../hooks/index.js'
import type { ColormapType } from '../../previews/Colormap.js'
import { densityFunction, densityFunction3D, densityPoint } from '../../previews/index.js'
import { Store } from '../../Store.js'
import { randomSeed } from '../../Utils.js'
import { Btn, BtnMenu, NumberInput } from '../index.js'
import { ColormapSelector } from './ColormapSelector.jsx'
import type { PreviewProps } from './index.js'

export const DensityFunctionPreview = ({ data, shown }: PreviewProps) => {
	const { locale } = useLocale()
	const [seed, setSeed] = useState(randomSeed())
	const [autoScroll, setAutoScroll] = useState(false)
	const [voxelMode, setVoxelMode] = useState(false)
	const [focused, setFocused] = useState<string[]>([])
	const [cutoff, setCutoff] = useState(0)
	const [colormap, setColormap] = useState<ColormapType>(Store.getColormap() ?? 'viridis')

	return <>
		<div class="controls preview-controls">
			{focused.map(s => <Btn label={s} class="no-pointer" /> )}
			{voxelMode ? <>
				<BtnMenu icon="gear">
					<div class="btn btn-input" onClick={e => e.stopPropagation()}>
						<span>{locale('cutoff')}</span>
						<NumberInput value={cutoff} onChange={setCutoff} />
					</div>
				</BtnMenu>
			</> : <>
				<ColormapSelector value={colormap} onChange={setColormap} />
				<BtnMenu icon="gear" tooltip={locale('terrain_settings')}>
					<Btn icon={autoScroll ? 'square_fill' : 'square'} label={locale('preview.auto_scroll')} onClick={() => setAutoScroll(!autoScroll)} />
				</BtnMenu>
			</>}
			<Btn icon="package" onClick={() => setVoxelMode(!voxelMode)} />
			<Btn icon="sync" tooltip={locale('generate_new_seed')}
				onClick={() => setSeed(randomSeed())} />
		</div>
		{voxelMode
			? <VoxelMode {...{data, shown, seed, cutoff}} />
			: <FlatMode {...{data, shown, seed, colormap, autoScroll, setFocused}} />}
	</>
}

interface VoxelModeProps {
	data: any
	shown: boolean
	seed: bigint
	cutoff: number
}
function VoxelMode({ data, shown, seed, cutoff }: VoxelModeProps) {
	const { project } = useProject()
	const { version } = useVersion()
	const renderer = useRef<VoxelRenderer | undefined>(undefined)
	const state = JSON.stringify([data])

	const { canvas, redraw } = useCanvas3D({
		view: { distance: 60 },
		center: [8, 128, 8],
		setup(gl, canvas) {
			const container = canvas.parentNode as HTMLElement
			const width = container.clientWidth
			const height = container.clientHeight
			canvas.width = width
			canvas.height = height
			renderer.current = new VoxelRenderer(gl)
			renderer.current.setViewport(0, 0, width, height)
		},
		draw(view) {
			renderer.current?.draw(view)
		},
	})

	useEffect(() => {
		const container = canvas.current?.parentNode
		if (!container || !renderer.current) return
		const onResize = () => {
			const width = (container as HTMLElement).clientWidth
			const height = (container as HTMLElement).clientHeight
			canvas.current!.width = width
			canvas.current!.height = height
			renderer.current?.setViewport(0, 0, width, height)
			requestAnimationFrame(() => redraw())
		}
		window.addEventListener('resize', onResize)
		return () => window.removeEventListener('resize', onResize)
	}, [canvas.current, renderer.current, redraw])

	useEffect(() => {
		if (shown && renderer.current) {
			(async () => {
				const points = await densityFunction3D(data, {
					project, seed, version, cutoff,
					minY: 0, height: 256,
				})
				renderer.current?.setVoxels(points.map(v => ({
					x: v.x,
					y: v.y,
					z: v.z,
					color: [200, 200, 200],
				})))
				redraw()
			})()
		}
	}, [renderer.current, state, shown, seed, version, cutoff, redraw])

	return <canvas ref={canvas} width="0" height="0" class="no-pixelated full-canvas"></canvas>
}

interface FlatModeProps {
	data: any
	shown: boolean
	seed: bigint
	colormap: ColormapType
	autoScroll: boolean
	setFocused: (s: string[]) => void
}
function FlatMode({ data, shown, seed, colormap, autoScroll, setFocused }: FlatModeProps) {
	const { project } = useProject()
	const { version } = useVersion()
	const [minY] = useState(0)
	const [height] = useState(256)
	const offset = useRef(0)
	const scrollInterval = useRef<number | undefined>(undefined)
	const state = JSON.stringify([data])

	const size = 256
	const { canvas, redraw } = useCanvas({
		size() {
			return [size, size]
		},
		async draw(img) {
			const options = { offset: offset.current, width: img.width, seed, version, project, minY, height, colormap }
			await densityFunction(data, img, options)
		},
		async onDrag(dx) {
			offset.current += dx * size
			redraw()
		},
		async onHover(x, y) {
			const worldX = Math.floor(x * size)
			const worldY = Math.floor(y * (height - minY))
			const options = { offset: offset.current, width: size, seed, version, project, minY, height, colormap }
			const density = await densityPoint(data, worldX, worldY, options)
			setFocused([density.toPrecision(3), `X=${Math.floor(worldX - offset.current)} Y=${(height - minY) - worldY}`])
		},
		onLeave() {
			setFocused([])
		},
	}, [version, state, seed, minY, height, colormap, project])

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
	}, [version, state, seed, minY, height, colormap, project, shown, autoScroll])

	return <canvas ref={canvas} width={size} height={size}></canvas>
}

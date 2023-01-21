import { DataModel } from '@mcschema/core'
import type { Voxel } from 'deepslate/render'
import { clampedMap, VoxelRenderer } from 'deepslate/render'
import type { mat3, mat4 } from 'gl-matrix'
import { vec2 } from 'gl-matrix'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { useLocale, useProject, useVersion } from '../../contexts/index.js'
import { useAsync } from '../../hooks/useAsync.js'
import type { ColormapType } from '../../previews/Colormap.js'
import { getColormap } from '../../previews/Colormap.js'
import { DEEPSLATE } from '../../previews/Deepslate.js'
import { getProjectData } from '../../previews/index.js'
import { Store } from '../../Store.js'
import { randomSeed } from '../../Utils.js'
import { Btn, BtnMenu, NumberInput } from '../index.js'
import { ColormapSelector } from './ColormapSelector.jsx'
import type { PreviewProps } from './index.js'
import { InteractiveCanvas2D } from './InteractiveCanvas2D.jsx'
import { InteractiveCanvas3D } from './InteractiveCanvas3D.jsx'

export const DensityFunctionPreview = ({ data, shown }: PreviewProps) => {
	const { locale } = useLocale()
	const { project } = useProject()
	const { version } = useVersion()
	const [voxelMode, setVoxelMode] = useState(false)
	const [seed, setSeed] = useState(randomSeed())
	const [minY] = useState(0)
	const [height] = useState(256)
	const serializedData = JSON.stringify(data)

	const { value: df } = useAsync(async () => {
		await DEEPSLATE.loadVersion(version, getProjectData(project))
		const df = DEEPSLATE.loadDensityFunction(DataModel.unwrapLists(data), minY, height, seed)
		return df
	}, [version, project, minY, height, seed, serializedData])

	// === 2D ===
	const imageData = useRef<ImageData>()
	const ctx = useRef<CanvasRenderingContext2D>()
	const [focused, setFocused] = useState<string[]>([])
	const [colormap, setColormap] = useState<ColormapType>(Store.getColormap() ?? 'viridis')

	const onSetup2D = useCallback((canvas: HTMLCanvasElement) => {
		const ctx2D = canvas.getContext('2d')
		if (!ctx2D) return
		ctx.current = ctx2D
	}, [voxelMode])
	const onResize2D = useCallback((width: number, height: number) => {
		if (!ctx.current) return
		imageData.current = ctx.current.getImageData(0, 0, width, height)
	}, [voxelMode])
	const onDraw2D = useCallback((transform: mat3) => {
		if (!ctx.current || !imageData.current || !df) return
		const img = imageData.current

		const arr = Array(img.width * img.height)
		let limit = 0.01
		const pos = vec2.create()
		for (let x = 0; x < img.width; x += 1) {
			for (let y = 0; y < img.height; y += 1) {
				const i = x + y * img.width
				vec2.transformMat3(pos, vec2.fromValues(x, y), transform)
				const worldX = Math.floor(pos[0])
				const worldY = -Math.floor(pos[1])
				const density = df.compute({ x: worldX, y: worldY, z: 0 })
				limit = Math.max(limit, Math.min(1, Math.abs(density)))
				arr[i] = density
			}
		}
		const colorPicker = getColormap(colormap ?? 'viridis')
		const min = -limit
		const max = limit
		const data = img.data
		for (let i = 0; i < img.width * img.height; i += 1) {
			const color = colorPicker(clampedMap(arr[i], min, max, 1, 0))
			data[4 * i] = color[0] * 256
			data[4 * i + 1] = color[1] * 256
			data[4 * i + 2] = color[2] * 256
			data[4 * i + 3] = 255
		}
		ctx.current.putImageData(img, 0, 0)
	}, [voxelMode, df, colormap])
	const onHover2D = useCallback((pos: [number, number] | undefined) => {
		if (!pos || !df) {
			setFocused([])
		} else {
			const [x, y] = pos
			const density = df.compute({ x: x, y: -y, z: 0 })
			setFocused([density.toPrecision(3), `X=${x} Y=${-y}`])
		}
	}, [voxelMode, df])


	// === 3D ===
	const renderer = useRef<VoxelRenderer | undefined>(undefined)
	const [state, setState] = useState(0)
	const [cutoff, setCutoff] = useState(0)

	const onSetup3D = useCallback((canvas: HTMLCanvasElement) => {
		const gl = canvas.getContext('webgl')
		if (!gl) return
		renderer.current = new VoxelRenderer(gl)
	}, [voxelMode])
	const onResize3D = useCallback((width: number, height: number) => {
		renderer.current?.setViewport(0, 0, width, height)
	}, [voxelMode])
	const onDraw3D = useCallback((transform: mat4) => {
		renderer.current?.draw(transform)
	}, [voxelMode])
	useEffect(() => {
		if (!renderer.current || !shown || !df || !voxelMode) return
		const voxels: Voxel[] = []
		const maxY = minY + height
		for (let x = 0; x < 16; x += 1) {
			for (let y = minY; y < maxY; y += 1) {
				for (let z = 0; z < 16; z += 1) {
					const density = df.compute({ x, y, z })
					if (density > cutoff) {
						voxels.push({ x, y, z, color: [200, 200, 200] })
					}
				}
			}
		}
		renderer.current.setVoxels(voxels)
		setState(state => state + 1)
	}, [voxelMode, df, cutoff])

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
			</>}
			<Btn label={voxelMode ? locale('3d') : locale('2d')} onClick={() => setVoxelMode(!voxelMode)} />
			<Btn icon="sync" tooltip={locale('generate_new_seed')}
				onClick={() => setSeed(randomSeed())} />
		</div>
		<div class="full-preview">{voxelMode
			? <InteractiveCanvas3D onSetup={onSetup3D} onDraw={onDraw3D} onResize={onResize3D} state={state} startDistance={100} startPosition={[8, 120, 8]} />
			: <InteractiveCanvas2D onSetup={onSetup2D} onDraw={onDraw2D} onHover={onHover2D} onResize={onResize2D} state={state} pixelSize={4} />
		}</div>
	</>
}

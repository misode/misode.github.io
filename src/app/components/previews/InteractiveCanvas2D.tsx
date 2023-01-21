import { mat3, vec2 } from 'gl-matrix'
import { useCallback, useEffect, useRef } from 'preact/hooks'

interface Props {
	onSetup: (canvas: HTMLCanvasElement) => void,
	onDraw: (transform: mat3) => void,
	onHover?: (offset: [number, number] | undefined) => void,
	onResize: (width: number, height: number) => void,
	state?: unknown,
	pixelSize?: number,
	startPosition?: [number, number],
	startScale?: number,
}
export function InteractiveCanvas2D({ onSetup, onDraw, onHover, onResize, state, pixelSize = 1, startPosition, startScale }: Props) {
	const canvas = useRef<HTMLCanvasElement>(null)
	const dragStart = useRef<[number, number] | undefined>()
	const dragButton = useRef<number | undefined>()
	const centerPos = useRef<[number, number]>(startPosition ?? [0, 0])
	const viewScale = useRef(startScale ?? 1)
	const frameRequest = useRef<number>()

	// Transforms screen coordinates to world coordinates
	const transform = useCallback(() => {
		const mat = mat3.create()
		if (!canvas.current) return mat
		const halfWidth = Math.floor(canvas.current.clientWidth / 2) / pixelSize
		const halfHeight = Math.floor(canvas.current.clientHeight / 2) / pixelSize
		const scale = Math.pow(2, Math.floor(Math.log(viewScale.current * pixelSize) /Math.log(2)))
		const offsetX = Math.floor(centerPos.current[0])
		const offsetY = Math.floor(centerPos.current[1])
		mat3.translate(mat, mat, [offsetX, offsetY])
		mat3.scale(mat, mat, [scale, scale])
		mat3.translate(mat, mat, [-halfWidth, -halfHeight])
		return mat
	}, [pixelSize])

	const redraw = useRef<Function>(() => {})
	useEffect(() => {
		redraw.current = function requestRedraw() {
			if (frameRequest.current !== undefined) {
				cancelAnimationFrame(frameRequest.current)
			}
			frameRequest.current = requestAnimationFrame(function redraw() {
				onDraw(transform())
			})
		}
	}, [onDraw, transform])

	useEffect(function changeDetected() {
		redraw.current()
	}, [state, onDraw, transform])

	useEffect(function setupListeners() {
		if (!canvas.current) return
		function onMouseDown(e: MouseEvent) {
			if (!canvas.current) return
			dragStart.current = [e.offsetX, e.offsetY]
			dragButton.current = e.button
		}
		function onMouseMove(e: MouseEvent) {
			if (!canvas.current) return
			if (dragStart.current === undefined) {
				const pos = vec2.fromValues(e.offsetX / pixelSize, e.offsetY / pixelSize)
				vec2.transformMat3(pos, pos, transform())
				onHover?.([Math.floor(pos[0]), Math.floor(pos[1])])
			} else {
				const dragEnd: [number, number] = [e.offsetX, e.offsetY]
				const dx = (dragEnd[0] - dragStart.current[0]) * (viewScale.current)
				const dy = (dragEnd[1] - dragStart.current[1]) * (viewScale.current)
				centerPos.current = [centerPos.current[0] - dx, centerPos.current[1] - dy]
				dragStart.current = dragEnd
				redraw.current()
			}
		}
		function onMouseUp () {
			dragStart.current = undefined
		}
		function onMouseLeave () {
			onHover?.(undefined)
		}
		function onWheel (e: WheelEvent) {
			const newScale = Math.pow(2, Math.log(viewScale.current) / Math.log(2) + e.deltaY / 200)
			if (newScale > 1/16 && newScale < 16) {
				viewScale.current = newScale
				redraw.current()
			}
			e.preventDefault()
		}
		function onContextMenu(evt: MouseEvent) {
			evt.preventDefault()
		}
		function resizeHandler() {
			if (!canvas.current) return
			const width = Math.floor(canvas.current.clientWidth / pixelSize)
			const height = Math.floor(canvas.current.clientHeight / pixelSize)
			canvas.current.width = width
			canvas.current.height = height
			onResize?.(width, height)
			redraw.current()
		}

		onSetup(canvas.current)
		resizeHandler()

		canvas.current.addEventListener('mousedown', onMouseDown)
		canvas.current.addEventListener('mousemove', onMouseMove)
		canvas.current.addEventListener('mouseleave', onMouseLeave)
		document.body.addEventListener('mouseup', onMouseUp)
		canvas.current.addEventListener('wheel', onWheel)
		canvas.current.addEventListener('contextmenu', onContextMenu)
		window.addEventListener('resize', resizeHandler)

		return () => {
			canvas.current?.removeEventListener('mousedown', onMouseDown)
			canvas.current?.removeEventListener('mousemove', onMouseMove)
			canvas.current?.removeEventListener('mouseleave', onMouseLeave)
			document.body.removeEventListener('mouseup', onMouseUp)
			canvas.current?.removeEventListener('wheel', onWheel)
			canvas.current?.removeEventListener('contextmenu', onContextMenu)
			window.removeEventListener('resize', resizeHandler)
		}
	}, [onSetup, onResize, onHover, transform, pixelSize])

	return <canvas ref={canvas}></canvas>
}

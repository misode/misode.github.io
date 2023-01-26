import { mat4, vec3 } from 'gl-matrix'
import { useEffect, useRef } from 'preact/hooks'

interface Props {
	onSetup: (canvas: HTMLCanvasElement) => void,
	onDraw: (transform: mat4) => void,
	onResize: (width: number, height: number) => void,
	state?: unknown,
	startPosition?: [number, number, number],
	startDistance?: number,
	startYRotation?: number,
	startXRotation?: number,
}
export function InteractiveCanvas3D({ onSetup, onDraw, onResize, state, startPosition, startDistance, startYRotation, startXRotation }: Props) {
	const canvas = useRef<HTMLCanvasElement>(null)
	const dragStart = useRef<[number, number] | undefined>()
	const dragButton = useRef<number | undefined>()
	const centerPos = useRef<[number, number, number]>(startPosition ? [-startPosition[0], -startPosition[1], -startPosition[2]] : [0, 0, 0])
	const viewDist = useRef(startDistance ?? 4)
	const yRotation = useRef(startYRotation ?? 0.8)
	const xRotation = useRef(startXRotation ?? 0.5)
	const frameRequest = useRef<number>()

	const redraw = useRef<Function>(() => {})
	useEffect(() => {
		redraw.current = function requestRedraw() {
			if (frameRequest.current !== undefined) {
				cancelAnimationFrame(frameRequest.current)
			}
			frameRequest.current = requestAnimationFrame(function redraw() {
				yRotation.current = yRotation.current % (Math.PI * 2)
				xRotation.current = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, xRotation.current))
				viewDist.current = Math.max(1, viewDist.current)

				const transform = mat4.create()
				mat4.translate(transform, transform, [0, 0, -viewDist.current])
				mat4.rotateX(transform, transform, xRotation.current)
				mat4.rotateY(transform, transform, yRotation.current)
				mat4.translate(transform, transform, centerPos.current)
				onDraw(transform)
			})
		}
	}, [onDraw])

	useEffect(function changeDetected() {
		redraw.current()
	}, [state, onDraw])

	useEffect(function setupListeners() {
		if (!canvas.current) return
		function onMouseDown(e: MouseEvent) {
			dragStart.current = [e.offsetX, e.offsetY]
			dragButton.current = e.button
		}
		function onMouseMove(e: MouseEvent) {
			if (dragStart.current === undefined) {
				return
			}
			const dx = e.offsetX - dragStart.current[0]
			const dy = e.offsetY - dragStart.current[1]
			if (dx === 0 && dy === 0) {
				return
			}
			if (dragButton.current === 0) {
				yRotation.current += dx / 100
				xRotation.current += dy / 100
				redraw.current()
			} else if (dragButton.current === 1 || dragButton.current === 2) {
				const pos = vec3.fromValues(centerPos.current[0], centerPos.current[1], centerPos.current[2])
				vec3.rotateY(pos, pos, [0, 0, 0], yRotation.current)
				vec3.rotateX(pos, pos, [0, 0, 0], xRotation.current)
				const d = vec3.fromValues(dx / 100, -dy / 100, 0)
				vec3.scale(d, d, 0.25 * viewDist.current)
				vec3.add(pos, pos, d)
				vec3.rotateX(pos, pos, [0, 0, 0], -xRotation.current)
				vec3.rotateY(pos, pos, [0, 0, 0], -yRotation.current)
				centerPos.current = [pos[0], pos[1], pos[2]]
				redraw.current()
			}
			dragStart.current = [e.offsetX, e.offsetY]
		}
		function onMouseUp() {
			dragStart.current = undefined
		}
		function onWheel(evt: WheelEvent) {
			viewDist.current = Math.max(1, viewDist.current + evt.deltaY / 100)
			redraw.current()
			evt.preventDefault()
		}
		function onContextMenu(evt: MouseEvent) {
			evt.preventDefault()
		}
		function resizeHandler() {
			if (!canvas.current) return
			const width = canvas.current.clientWidth
			const height = canvas.current.clientHeight
			canvas.current.width = width
			canvas.current.height = height
			onResize?.(width, height)
			redraw.current()
		}

		onSetup(canvas.current)
		resizeHandler()

		canvas.current.addEventListener('mousedown', onMouseDown)
		canvas.current.addEventListener('mousemove', onMouseMove)
		document.body.addEventListener('mouseup', onMouseUp)
		canvas.current.addEventListener('wheel', onWheel)
		canvas.current.addEventListener('contextmenu', onContextMenu)
		window.addEventListener('resize', resizeHandler)

		return () => {
			canvas.current?.removeEventListener('mousedown', onMouseDown)
			canvas.current?.removeEventListener('mousemove', onMouseMove)
			document.body.removeEventListener('mouseup', onMouseUp)
			canvas.current?.removeEventListener('wheel', onWheel)
			canvas.current?.removeEventListener('contextmenu', onContextMenu)
			window.removeEventListener('resize', resizeHandler)
		}
	}, [onSetup, onResize])

	return <canvas ref={canvas}></canvas>
}

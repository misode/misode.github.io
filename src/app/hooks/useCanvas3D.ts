import { mat4, vec3 } from 'gl-matrix'
import type { Inputs } from 'preact/hooks'
import { useCallback, useEffect, useRef } from 'preact/hooks'

export function useCanvas3D({ view, center, setup, draw }: {
	view?: { distance?: number, xRotation?: number, yRotation?: number },
	center?: [number, number, number],
	setup: (gl: WebGLRenderingContext, canvas: HTMLCanvasElement) => void,
	draw: (viewMatrix: mat4) => void,
}, inputs?: Inputs) {
	const canvas = useRef<HTMLCanvasElement>(null)
	useEffect(() => {
		if (canvas.current) {
			const gl = canvas.current.getContext('webgl')
			if (gl) {
				setup(gl, canvas.current)
			}
		}
	}, [canvas.current])

	const dragStart = useRef<[number, number] | undefined>()
	const dragButton = useRef<number | undefined>()
	const centerPos = useRef<[number, number, number]>(center ? [-center[0], -center[1], -center[2]] : [0, 0, 0])
	const viewDist = useRef(view?.distance ?? 4)
	const yRotation = useRef(view?.yRotation ?? 0.8)
	const xRotation = useRef(view?.xRotation ?? 0.5)

	const redraw = useCallback(() => {
		yRotation.current = yRotation.current % (Math.PI * 2)
		xRotation.current = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, xRotation.current))
		viewDist.current = Math.max(1, viewDist.current)

		const view = mat4.create()
		mat4.translate(view, view, [0, 0, -viewDist.current])
		mat4.rotateX(view, view, xRotation.current)
		mat4.rotateY(view, view, yRotation.current)
		mat4.translate(view, view, centerPos.current)
		draw(view)
	}, [draw, center])

	useEffect(() => {
		if (!canvas.current) return
		const onMouseDown = (e: MouseEvent) => {
			dragStart.current = [e.offsetX, e.offsetY]
			dragButton.current = e.button
		}
		const onMouseMove = (e: MouseEvent) => {
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
				requestAnimationFrame(() => redraw())
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
				requestAnimationFrame(() => redraw())
			}
			dragStart.current = [e.offsetX, e.offsetY]
		}
		const onMouseUp = () => {
			dragStart.current = undefined
		}
		const onWheel = (evt: WheelEvent) => {
			viewDist.current = Math.max(1, viewDist.current + evt.deltaY / 100)
			requestAnimationFrame(() => redraw())
			evt.preventDefault()
		}
		const onContextMenu = (evt: MouseEvent) => {
			evt.preventDefault()
		}

		canvas.current.addEventListener('mousedown', onMouseDown)
		canvas.current.addEventListener('mousemove', onMouseMove)
		document.body.addEventListener('mouseup', onMouseUp)
		canvas.current.addEventListener('wheel', onWheel)
		canvas.current.addEventListener('contextmenu', onContextMenu)

		return () => {
			canvas.current?.removeEventListener('mousedown', onMouseDown)
			canvas.current?.removeEventListener('mousemove', onMouseMove)
			document.body.removeEventListener('mouseup', onMouseUp)
			canvas.current?.removeEventListener('wheel', onWheel)
			canvas.current?.removeEventListener('contextmenu', onContextMenu)
		}
	}, [...inputs ?? [], canvas.current, redraw])

	return {
		canvas,
		redraw,
	}
}

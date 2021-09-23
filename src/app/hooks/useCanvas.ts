import type { Inputs } from 'preact/hooks'
import { useEffect, useRef } from 'preact/hooks'

type Vec2 = [number, number]

export function useCanvas({ size, draw, onDrag, onHover, onLeave }: {
	size: () => Vec2,
	draw: (img: ImageData) => Promise<unknown>,
	onDrag?: (dx: number, dy: number) => Promise<unknown>,
	onHover?: (x: number, y: number) => unknown,
	onLeave?: () => unknown,
}, inputs?: Inputs) {
	const canvas = useRef<HTMLCanvasElement>(null)

	const dragStart = useRef<Vec2 | undefined>()
	const dragRequest = useRef<number>()
	const dragPending = useRef<Vec2>([0, 0])
	const dragBusy = useRef(false)

	useEffect(() => {
		const onMouseDown = (e: MouseEvent) => {
			dragStart.current = [e.offsetX, e.offsetY]
		}
		const onMouseMove = (e: MouseEvent) => {
			if (dragStart.current === undefined) {
				const x = e.offsetX  / canvas.current.clientWidth
				const y = e.offsetY  / canvas.current.clientHeight
				onHover?.(x, y)
				return
			}
			if (!onDrag) return
			const dx = e.offsetX - dragStart.current[0]
			const dy = e.offsetY - dragStart.current[1]
			if (!(dx === 0 && dy === 0)) {
				dragPending.current = [dragPending.current[0] + dx, dragPending.current[1] + dy]
				if (!dragBusy.current) {
					cancelAnimationFrame(dragRequest.current)
					dragRequest.current = requestAnimationFrame(async () => {
						dragBusy.current = true
						const dx = dragPending.current[0] / canvas.current.clientWidth
						const dy = dragPending.current[1] / canvas.current.clientHeight
						dragPending.current = [0, 0]
						await onDrag?.(dx, dy)
						dragBusy.current = false
					})
				}
			}
			dragStart.current = [e.offsetX, e.offsetY]
		}
		const onMouseUp = () => {
			dragStart.current = undefined
		}
		const onMouseLeave = () => {
			onLeave?.()
		}

		canvas.current.addEventListener('mousedown', onMouseDown)
		canvas.current.addEventListener('mousemove', onMouseMove)
		canvas.current.addEventListener('mouseleave', onMouseLeave)
		document.body.addEventListener('mouseup', onMouseUp)

		return () => {
			canvas.current.removeEventListener('mousedown', onMouseDown)
			canvas.current.removeEventListener('mousemove', onMouseMove)
			canvas.current.removeEventListener('mouseleave', onMouseLeave)
			document.body.removeEventListener('mouseup', onMouseUp)
		}
	}, [...inputs ?? [], canvas.current])

	const redraw = useRef<() => Promise<unknown>>()
	const redrawCount = useRef(0)
	redraw.current = async () => {
		const ctx = canvas.current.getContext('2d')!
		const s = size()
		canvas.current.width = s[0]
		canvas.current.height = s[1]
		const img = ctx.getImageData(0, 0, s[0], s[1])
		const ownCount = redrawCount.current += 1
		await draw(img)
		if (ownCount === redrawCount.current) {
			ctx.putImageData(img, 0, 0)
		}
	}

	return {
		canvas,
		redraw: redraw.current,
	}
}

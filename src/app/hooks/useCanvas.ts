import type { Inputs } from 'preact/hooks'
import { useEffect, useRef } from 'preact/hooks'

type Context<Data> = { data: Data, offset: Vec2}
type Vec2 = [number, number]

export function useCanvas<Data>({ data, size, draw, point, leave }: {
	data: () => Data,
	size: (context: Context<Data>) => Vec2,
	draw: (img: ImageData, context: Context<Data>, schedule: (timeout: number, data?: Data) => unknown) => Promise<unknown>,
	point?: (x: number, y: number, context: Context<Data>) => Promise<unknown>,
	leave?: () => Promise<unknown>,
}, inputs?: Inputs) {
	const canvas = useRef<HTMLCanvasElement>(null)
	const offset = useRef<Vec2>([0, 0])
	const dataRef = useRef(data())
	const sizeRef = useRef<Vec2>(size({ data: dataRef.current, offset: offset.current }))

	const request = useRef<number>()
	const dragStart = useRef<Vec2 | undefined>()
	const pending = useRef<Vec2>([0, 0])

	useEffect(() => {
		const onMouseDown = (e: MouseEvent) => {
			dataRef.current = data()
			dragStart.current = [e.offsetX, e.offsetY]
		}
		const onMouseMove = (e: MouseEvent) => {
			const context = { data: dataRef.current, offset: offset.current }
			console.log(`Move ${dataRef.current}`)
			sizeRef.current = size(context)
			if (dragStart.current === undefined) {
				const x = e.offsetX * sizeRef.current[0] / canvas.current.clientWidth
				const y = e.offsetY * sizeRef.current[1] / canvas.current.clientHeight
				point?.(x, y, context)
				return
			}
			const dx = e.offsetX - dragStart.current[0]
			const dy = e.offsetY - dragStart.current[1]
			if (!(dx === 0 && dy === 0)) {
				cancelAnimationFrame(request.current)
				pending.current = [pending.current[0] + dx, pending.current[1] + dy]
				request.current = requestAnimationFrame(() => {
					const [dx, dy] = pending.current
					const x = offset.current[0] + dx * sizeRef.current[0] / canvas.current.clientWidth
					const y = offset.current[1] + dy * sizeRef.current[1] / canvas.current.clientHeight
					offset.current = [x, y]
					redraw.current()
					pending.current = [0, 0]
				})
			}
			dragStart.current = [e.offsetX, e.offsetY]
		}
		const onMouseUp = () => {
			dragStart.current = undefined
		}
		const onMouseLeave = () => {
			leave?.()
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
	const redrawTimeout = useRef<number>(undefined)
	const redrawCount = useRef(0)
	redraw.current = async () => {
		const ctx = canvas.current.getContext('2d')!
		const context = { data: dataRef.current, offset: offset.current }
		const s = size(context)
		canvas.current.width = s[0]
		canvas.current.height = s[1]
		const img = ctx.createImageData(s[0], s[1])
		const ownCount = redrawCount.current += 1
		console.log(`Redraw... ${dataRef.current} ${ownCount}`)
		await draw(img, context, (timeout, d) => {
			clearTimeout(redrawTimeout.current)
			redrawTimeout.current = setTimeout(() => {
				if (d) {
					dataRef.current = d
				}
				redraw.current()
			}, timeout)
		})
		if (ownCount === redrawCount.current) {
			ctx.putImageData(img, 0, 0)
			console.log(` Update :D ${dataRef.current} ${ownCount}`)
		} else {
			console.log(` Outdated -_- ${dataRef.current} ${ownCount} ${redrawCount.current}`)
		}
	}

	return {
		canvas,
		redraw: (d?: Data) => {
			if (d) {
				dataRef.current = d
			}
			redraw.current()
		},
		move: (offsetter: (offset: Vec2) => Vec2) => {
			offset.current = offsetter(offset.current)
		},
	}
}

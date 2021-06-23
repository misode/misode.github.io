import { useEffect, useRef } from 'preact/hooks'

export function useOnDrag(element: HTMLElement, drag: (dx: number, dy: number) => unknown) {
	if (!element) return

	const request = useRef<number>()
	const dragStart = useRef<[number, number] | undefined>()
	const pending = useRef<[number, number]>([0, 0])

	useEffect(() => {
		const onMouseDown = (e: MouseEvent) => {
			dragStart.current = [e.offsetX, e.offsetY]
		}
		const onMouseMove = (e: MouseEvent) => {
			if (dragStart.current === undefined) return
			const dx = e.offsetX - dragStart.current[0]
			const dy = e.offsetY - dragStart.current[1]
			if (!(dx === 0 && dy === 0)) {
				cancelAnimationFrame(request.current)
				pending.current = [pending.current[0] + dx, pending.current[1] + dy]
				request.current = requestAnimationFrame(() => {
					drag(...pending.current)
					pending.current = [0, 0]
				})
			}
			dragStart.current = [e.offsetX, e.offsetY]
		}
		const onMouseUp = (_e: MouseEvent) => {
			dragStart.current = undefined
		}

		element.addEventListener('mousedown', onMouseDown)
		element.addEventListener('mousemove', onMouseMove)
		document.body.addEventListener('mouseup', onMouseUp)
		return () => {
			element.removeEventListener('mousedown', onMouseDown)
			element.removeEventListener('mousemove', onMouseMove)
			document.body.removeEventListener('mouseup', onMouseUp)
		}
	}, [element])
}

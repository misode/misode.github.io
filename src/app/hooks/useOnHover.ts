import { useEffect } from 'preact/hooks'

export function useOnHover(element: HTMLElement, hover: (x: number | undefined, y: number | undefined) => unknown) {
	if (!element) return

	const onMouseMove = (e: MouseEvent) => {
		hover(e.offsetX, e.offsetY)
	}
	const onMouseLeave = () => {
		hover(undefined, undefined)
	}

	useEffect(() => {
		element.addEventListener('mousemove', onMouseMove)
		element.addEventListener('mouseleave', onMouseLeave)
		return () => {
			element.removeEventListener('mousemove', onMouseMove)
			element.removeEventListener('mouseleave', onMouseLeave)
		}
	}, [element])
}

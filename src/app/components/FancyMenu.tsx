import type { ComponentChildren } from 'preact'
import { useCallback, useMemo, useRef, useState } from 'preact/hooks'
import { useFocus } from '../hooks/index.js'

interface Props {
	placeholder?: string
	relative?: boolean
	class?: string
	getResults: (search: string, close: () => void) => ComponentChildren
	children: ComponentChildren
}
export function FancyMenu({ placeholder, relative, class: clazz, getResults, children }: Props) {
	const [active, setActive] = useFocus()
	const [search, setSearch] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)
	const resultsRef = useRef<HTMLDivElement>(null)

	const results = useMemo(() => {
		return getResults(search, () => setActive(false))
	}, [getResults, setActive, search])

	const open = useCallback(() => {
		setActive(true)
		setTimeout(() => {
			inputRef.current?.select()
		})
	}, [setActive, inputRef])

	const handleKeyDown = useCallback((e: KeyboardEvent) => {
		if (e.key == 'Enter') {
			if (document.activeElement == inputRef.current) {
				const firstResult = resultsRef.current?.firstElementChild
				if (firstResult instanceof HTMLElement) {
					firstResult.click()
				}
			}
		} else if (e.key == 'ArrowDown') {
			const nextElement = document.activeElement == inputRef.current
				? resultsRef.current?.firstElementChild
				: document.activeElement?.nextElementSibling
			if (nextElement instanceof HTMLElement) {
				nextElement.focus()
			}
			e.preventDefault()
		} else if (e.key == 'ArrowUp') {
			const prevElement = document.activeElement?.previousElementSibling
			if (prevElement instanceof HTMLElement) {
				prevElement.focus()
			}
			e.preventDefault()
		} else if (e.key == 'Escape') {
			setActive(false)
		}
	}, [setActive, inputRef])

	return <div class={`${relative ? 'relative' : ''}`}>
		<div onClick={open}>
			{children}
		</div>
		<div class={`fancy-menu absolute flex flex-col gap-2 p-2 rounded-lg drop-shadow-xl ${clazz} ${active ? '' : 'hidden'}`} onKeyDown={handleKeyDown}>
			<input ref={inputRef} type="text" class="py-1 px-2 w-full rounded" value={search} placeholder={placeholder} onInput={(e) => setSearch((e.target as HTMLInputElement).value)} onClick={(e) => e.stopPropagation()} />
			{active && <div ref={resultsRef} class="fancy-menu-results overflow-y-auto overscroll-none flex flex-col pr-2 h-96 max-h-max w-max max-w-full">
				{results}
			</div>}
		</div>
	</div>
}

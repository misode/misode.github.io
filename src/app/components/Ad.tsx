import { useEffect } from 'preact/hooks'

declare const ethicalads: any

type AdProps = {
	type: 'text' | 'image',
	id: string,
}
export function Ad({ type, id }: AdProps) {
	useEffect(() => {
		document.getElementById('ad-placeholder')?.remove()
		ethicalads?.load()
	}, [])

	return <div data-ea-publisher="misode-github-io" data-ea-type={type} class="ad dark flat" id={id}></div>
}

import { useEffect } from 'preact/hooks'

declare const ethicalads: any

type AdProps = {
	type: 'text' | 'image',
	id: string,
}
export function Ad({ type, id }: AdProps) {
	if (type === 'text') {
		return <div data-ea-publisher="misode-github-io" data-ea-type="text" class="ad dark flat loaded">
			<div class="ea-placement ea-type-text">
				<a href="https://misode.github.io/bingo/" target="_blank">
					<div class="ea-content" style="display: flex; gap: 6px; align-items: center;">
						<img height="36" src="https://misode.github.io/bingo/assets/icon.png" alt="Minecraft Live Bingo logo" />
						<div class="ea-text">
							<strong>Bingo!</strong>
							<span> Generate your own random bingo card to fill out as you watch </span>
							<strong> Minecraft Live 2022!</strong>
						</div>
					</div>
				</a>
				<div class="ea-callout"><a rel="nofollow noopener" target="_blank" href="https://github.com/misode">Ad by Misode</a></div>
			</div>
		</div>
	}

	useEffect(() => {
		document.getElementById('ad-placeholder')?.remove()
		if ('ethicalads' in window) {
			ethicalads.load()
		}
	}, [])

	return <div data-ea-publisher="misode-github-io" data-ea-type={type} class="ad dark flat loaded" id={id}></div>
}

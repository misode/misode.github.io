import type { ComponentChildren } from 'preact'

interface Props {
	title: ComponentChildren,
	link: string,
	overlay?: ComponentChildren,
	children?: ComponentChildren,
}
export function Card({ title, overlay: subTitle, link, children }: Props) {
	return <a class="card" href={link} >
		<span class="card-overlay">{subTitle}</span>
		<h3 class="card-title">{title}</h3>
		{children}
	</a>
}

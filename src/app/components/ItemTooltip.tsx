import { TextComponent } from './TextComponent.jsx'

interface Props {
	id: string,
	tag?: any,
	advanced?: boolean,
	offset?: [number, number],
	swap?: boolean,
}
export function ItemTooltip({ id, tag, advanced, offset = [0, 0], swap }: Props) {
	const displayName = tag?.display?.Name
	const name = displayName ? JSON.parse(displayName) : fakeTranslation(id.replace(/^minecraft:/, ''))

	const lore: string[] = tag?.display?.Lore ?? []

	return <div class="item-tooltip" style={offset && {
		left: (swap ? undefined : `${offset[0]}px`),
		right: (swap ? `${offset[0]}px` : undefined),
		top: `${offset[1]}px`,
	}}>
		<TextComponent component={name} base={{ color: 'white' }} />
		{lore.map(line => <TextComponent component={JSON.parse(line)} base={{ color: 'dark_purple', italic: true }} />)}
		{advanced && <TextComponent component={{ text: id, color: 'dark_gray'}} />}
	</div>
}

function fakeTranslation(str: string) {
	const raw = str.replaceAll('_', ' ')
	return raw[0].toUpperCase() + raw.slice(1)
}

import { useVersion } from '../contexts/Version.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { MaxDamageItems } from '../previews/LootTable.js'
import { getTranslation } from '../services/Resources.js'
import { TextComponent } from './TextComponent.jsx'

interface Props {
	id: string,
	tag?: any,
	advanced?: boolean,
	offset?: [number, number],
	swap?: boolean,
}
export function ItemTooltip({ id, tag, advanced, offset = [0, 0], swap }: Props) {
	const { version } = useVersion()
	const { value: translatedName } = useAsync(() => {
		const key = id.split(':').join('.')
		return getTranslation(version, `item.${key}`) ?? getTranslation(version, `block.${key}`)
	}, [version, id])
	const displayName = tag?.display?.Name
	const name = displayName ? JSON.parse(displayName) : (translatedName ?? fakeTranslation(id))

	const maxDamage = MaxDamageItems.get(id)

	return <div class="item-tooltip" style={offset && {
		left: (swap ? undefined : `${offset[0]}px`),
		right: (swap ? `${offset[0]}px` : undefined),
		top: `${offset[1]}px`,
	}}>
		<TextComponent component={name} base={{ color: 'white' }} />
		{tag?.display && <>
			{tag?.display?.color && (advanced
				? <TextComponent component={{ translate: 'item.color', with: [`#${tag.display.color.toString(16).padStart(6, '0')}`], color: 'gray' }} />
				: <TextComponent component={{ translate: 'item.dyed', color: 'gray' }} />)}
			{(tag?.display?.Lore ?? []).map((line: any) => <TextComponent component={JSON.parse(line)} base={{ color: 'dark_purple', italic: true }} />)}
		</>}
		{tag?.Unbreakable === true && <TextComponent component={{ translate: 'item.unbreakable', color: 'blue' }} />}
		{(advanced && (tag?.Damage ?? 0) > 0 && maxDamage) && <TextComponent component={{ translate: 'item.durability', with: [`${maxDamage - tag.Damage}`, `${maxDamage}`] }} />}
		{advanced && <>
			<TextComponent component={{ text: id, color: 'dark_gray'}} />
			{tag && <TextComponent component={{ translate: 'item.nbt_tags', with: [Object.keys(tag).length], color: 'dark_gray' }} />}
		</>}
	</div>
}

function fakeTranslation(str: string) {
	const raw = str.replace(/minecraft:/, '').replaceAll('_', ' ')
	return raw[0].toUpperCase() + raw.slice(1)
}

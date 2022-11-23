import type { ItemStack } from 'deepslate'
import { Identifier, NbtList, NbtType } from 'deepslate'
import { useVersion } from '../contexts/Version.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { getEnchantmentData, MaxDamageItems } from '../previews/LootTable.js'
import { getTranslation } from '../services/Resources.js'
import { TextComponent } from './TextComponent.jsx'

interface Props {
	item: ItemStack,
	advanced?: boolean,
	offset?: [number, number],
	swap?: boolean,
}
export function ItemTooltip({ item, advanced, offset = [0, 0], swap }: Props) {
	const { version } = useVersion()
	const { value: translatedName } = useAsync(() => {
		const key = `${item.id.namespace}.${item.id.path}`
		return getTranslation(version, `item.${key}`) ?? getTranslation(version, `block.${key}`)
	}, [version, item.id])
	const displayName = item.tag.getCompound('display').getString('Name')
	const name = displayName ? JSON.parse(displayName) : (translatedName ?? fakeTranslation(item.id.path))

	const maxDamage = MaxDamageItems.get(item.id.toString())
	const enchantments = (item.id.equals(Identifier.create('enchanted_book')) ? item.tag.getList('StoredEnchantments', NbtType.Compound) : item.tag.getList('Enchantments', NbtType.Compound)) ?? NbtList.create()

	return <div class="item-tooltip" style={offset && {
		left: (swap ? undefined : `${offset[0]}px`),
		right: (swap ? `${offset[0]}px` : undefined),
		top: `${offset[1]}px`,
	}}>
		<TextComponent component={name} base={{ color: 'white', italic: displayName.length > 0 }} />
		{enchantments.map(enchantment => {
			const id = enchantment.getString('id')
			const lvl = enchantment.getNumber('lvl')
			const ench = getEnchantmentData(id)
			const component: any[] = [{ translate: `enchantment.${id.replace(':', '.')}`, color: ench?.curse ? 'red' : 'gray' }]
			if (lvl !== 1 || ench?.maxLevel !== 1) {
				component.push(' ', { translate: `enchantment.level.${lvl}`})
			}
			return <TextComponent component={component} />
		})}
		{item.tag.hasCompound('display') && <>
			{item.tag.getCompound('display').hasNumber('color') && (advanced
				? <TextComponent component={{ translate: 'item.color', with: [`#${item.tag.getCompound('display').getNumber('color').toString(16).padStart(6, '0')}`], color: 'gray' }} />
				: <TextComponent component={{ translate: 'item.dyed', color: 'gray' }} />)}
			{(item.tag.getCompound('display').getList('Lore', NbtType.String)).map((line) => <TextComponent component={JSON.parse(line.getAsString())} base={{ color: 'dark_purple', italic: true }} />)}
		</>}
		{item.tag.getBoolean('Unbreakable') && <TextComponent component={{ translate: 'item.unbreakable', color: 'blue' }} />}
		{(advanced && item.tag.getNumber('Damage') > 0 && maxDamage) && <TextComponent component={{ translate: 'item.durability', with: [`${maxDamage - item.tag.getNumber('Damage')}`, `${maxDamage}`] }} />}
		{advanced && <>
			<TextComponent component={{ text: item.id.toString(), color: 'dark_gray'}} />
			{item.tag.size > 0 && <TextComponent component={{ translate: 'item.nbt_tags', with: [item.tag.size], color: 'dark_gray' }} />}
		</>}
	</div>
}

function fakeTranslation(str: string) {
	return str
		.replace(/[_\/]/g, ' ')
		.split(' ')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

import type { ItemStack } from 'deepslate/core'
import { AttributeModifierOperation, Enchantment, Identifier, MobEffectInstance, Potion } from 'deepslate/core'
import { NbtList, NbtType } from 'deepslate/nbt'
import { useMemo } from 'preact/hooks'
import { useVersion } from '../contexts/Version.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { getTranslation } from '../services/Resources.js'
import { TextComponent } from './TextComponent.jsx'

interface Props {
	item: ItemStack,
	advanced?: boolean,
}
export function ItemTooltip({ item, advanced }: Props) {
	const { version } = useVersion()

	const isPotion = item.is('potion') || item.is('splash_potion') || item.is('lingering_potion')
	const descriptionId = useMemo(() => {
		const d = `${item.id.namespace}.${item.id.path}`
		if (isPotion) {
			return `${d}.effect.${Potion.fromNbt(item).name}`
		}
		return d
	}, [item])
	const { value: translatedName } = useAsync(() => {
		return getTranslation(version, `item.${descriptionId}`) ?? getTranslation(version, `block.${descriptionId}`)
	}, [version, descriptionId])
	const displayName = item.tag.getCompound('display').getString('Name')
	const name = displayName ? JSON.parse(displayName) : (translatedName ?? fakeTranslation(item.id.path))

	const durability = item.getItem().durability
	const enchantments = (item.is('enchanted_book') ? item.tag.getList('StoredEnchantments', NbtType.Compound) : item.tag.getList('Enchantments', NbtType.Compound)) ?? NbtList.create()

	const effects = isPotion ? Potion.getAllEffects(item) : []
	const attributeModifiers = isPotion ? Potion.getAllAttributeModifiers(item) : []

	return <>
		<TextComponent component={name} base={{ color: 'white', italic: displayName.length > 0 }} />
		{(!advanced && displayName.length === 0 && item.is('filled_map') && item.tag.hasNumber('map')) && <>
			<TextComponent component={{ text: `#${item.tag.getNumber('map')}`, color: 'gray' }} />
		</>}
		{(item.is('filled_map') && advanced) && <>
			<TextComponent component={{ translate: 'filled_map.unknown', color: 'gray' }} />
		</>}
		{isPotion && effects.length === 0
			? <TextComponent component={{ translate: 'effect.none', color: 'gray' }} />
			: effects.map(e => {
				const color = e.effect.category === 'harmful' ? 'red' : 'blue'
				let component: any = { translate: `effect.${e.effect.id.namespace}.${e.effect.id.path}` }
				if (e.amplifier > 0) {
					component = { translate: 'potion.withAmplifier', with: [component, { translate: `potion.potency.${e.amplifier}` }] }
				}
				if (e.duration > 20) {
					component = { translate: 'potion.withDuration', with: [component, MobEffectInstance.formatDuration(e)] }
				}
				return <TextComponent component={{ ...component, color }} />
			})}
		{attributeModifiers.length > 0 && <>
			<TextComponent component='' />
			<TextComponent component={{ translate: 'potion.whenDrank', color: 'dark_purple' }} />
			{attributeModifiers.map(([attr, { amount, operation }]) => {
				const a = operation === AttributeModifierOperation.addition ? amount * 100 : amount
				if (amount > 0) {
					return <TextComponent component={{ translate: `attribute.modifier.plus.${operation}`, with: [Math.floor(a * 100) / 100, { translate: `attribute.name.${attr.id.path}` }], color: 'blue' }} />
				} else if (amount < 0) {
					return <TextComponent component={{ translate: `attribute.modifier.take.${operation}`, with: [Math.floor(a * -100) / 100, { translate: `attribute.name.${attr.id.path}` }], color: 'red' }} />
				}
				return null
			})}
		</>}
		{enchantments.map(enchantment => {
			const id = enchantment.getString('id')
			const lvl = enchantment.getNumber('lvl')
			const ench = Enchantment.REGISTRY.get(Identifier.parse(id))
			const component: any[] = [{ translate: `enchantment.${id.replace(':', '.')}`, color: ench?.isCurse ? 'red' : 'gray' }]
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
		{(advanced && item.tag.getNumber('Damage') > 0 && durability) && <TextComponent component={{ translate: 'item.durability', with: [`${durability - item.tag.getNumber('Damage')}`, `${durability}`] }} />}
		{advanced && <>
			<TextComponent component={{ text: item.id.toString(), color: 'dark_gray'}} />
			{item.tag.size > 0 && <TextComponent component={{ translate: 'item.nbt_tags', with: [item.tag.size], color: 'dark_gray' }} />}
		</>}
	</>
}

function fakeTranslation(str: string) {
	return str
		.replace(/[_\/]/g, ' ')
		.split(' ')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

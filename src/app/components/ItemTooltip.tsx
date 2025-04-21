import type { MobEffectInstance, NbtTag } from 'deepslate'
import { ItemStack, NbtCompound, NbtList, PotionContents } from 'deepslate'
import { Identifier } from 'deepslate/core'
import { useVersion } from '../contexts/Version.jsx'
import type { ResolvedItem } from '../services/ResolvedItem.js'
import { intToDisplayHexRgb, makeDescriptionId, mergeTextComponentStyles } from '../Utils.js'
import { TextComponent } from './TextComponent.jsx'

interface Props {
	item: ResolvedItem,
	advanced?: boolean,
	resolver: (item: ItemStack) => ResolvedItem,
}
export function ItemTooltip({ item, advanced, resolver }: Props) {
	const { version } = useVersion()
	return <>
		<TextComponent component={item.getStyledHoverName(version)} />
		{!advanced && !item.has('custom_name') && item.is('filled_map') && item.has('map_id') && (
			<TextComponent component={{ translate: 'filled_map.id', with: [item.get('map_id', tag => tag.getAsNumber())], color: 'gray' }} />
		)}
		{!item.has('hide_additional_tooltip') && <>
			{item.is('filled_map') && advanced && (item.get('map_id', tag => tag.isNumber())
				? <TextComponent component={{ translate: 'filled_map.id', with: [item.get('map_id', tag => tag.getAsNumber())], color: 'gray' }} />
				: <TextComponent component={{ translate: 'filled_map.unknown', color: 'gray' }} />
			)}
			{(item.id.path.endsWith('_banner') || item.is('shield')) && item.get('banner_patterns', tag => tag.isList() ? tag : [])?.map(layer =>
				<TextComponent component={{ translate: `${layer.isCompound() ? (layer.hasCompound('pattern') ? layer.getString('translation_key') : `block.minecraft.banner.${layer.getString('pattern').replace(/^minecraft:/, '')}`) : ''}.${layer.isCompound() ? layer.getString('color') : ''}`, color: 'gray' }} />
			)}
			{item.is('crossbow') && item.getChargedProjectile() && (
				<TextComponent component={{ translate: 'item.minecraft.crossbow.projectile', extra: [' ', resolver(item.getChargedProjectile()!).getDisplayName(version)] }}/>
			)}
			{item.is('disc_fragment_5') && (
				<TextComponent component={{ translate: `${makeDescriptionId('item', item.id)}.desc`, color: 'gray' }} />
			)}
			{item.is('firework_rocket') && item.has('fireworks') && <>
				{((item.get('fireworks', tag => tag.isCompound() ? tag.getNumber('flight_duration') : 0) ?? 0) > 0) && (
					<TextComponent component={{ translate: 'item.minecraft.firework_rocket.flight', extra: [' ', item.get('fireworks', tag => tag.isCompound() ? tag.getNumber('flight_duration') : 0)], color: 'gray'}} />
				)}
				{/* TODO: firework explosions */}
			</>}
			{item.is('firework_star') && item.has('firework_explosion') && (
				<TextComponent component={{ translate: `item.minecraft.firework_star.shape.${item.get('firework_explosion', tag => tag.isCompound() ? tag.getString('shape') : '')}`, color: 'gray' }} />
				// TODO: additional stuff
			)}
			{/* TODO: painting variants */}
			{item.is('goat_horn') && item.has('instrument') && (
				<TextComponent component={mergeTextComponentStyles(item.get('instrument', tag => tag.isCompound()
					?	tag.get('description')?.toSimplifiedJson()
					: { translate: makeDescriptionId('instrument', Identifier.parse(tag.getAsString()))}
				), { color: 'gray' })} />
			)}
			{(item.is('lingering_potion') || item.is('potion') || item.is('splash_potion') || item.is('tipped_arrow')) && (
				<PotionContentsTooltip contents={PotionContents.fromNbt(item.get('potion_contents', tag => tag) ?? NbtCompound.create())} factor={item.is('lingering_potion') ? 0.25 : item.is('tipped_arrow') ? 0.125 : 1} />
			)}
			{/* TODO: mob buckets */}
			{/* TODO: smithing templates */}
			{item.is('written_book') && item.has('written_book_content') && <>
				<TextComponent component={{ translate: 'book.byAuthor', with: [item.get('written_book_content', tag => tag.isCompound() ? tag.getString('author') : undefined) ?? ''], color: 'gray' }} />
				<TextComponent component={{ translate: `book.generation.${item.get('written_book_content', tag => tag.isCompound() ? tag.getNumber('generation') : undefined) ?? 0}`, color: 'gray' }} />
			</>}
			{(item.is('beehive') || item.is('bee_nest')) && <>
				<TextComponent component={{ translate: 'container.beehive.bees', with: [item.get('bees', tag => tag.isList() ? tag.length : 0) ?? 0, 3], color: 'gray' }} />
				<TextComponent component={{ translate: 'container.beehive.honey', with: [item.get('block_state', tag => tag.isCompound() ? tag.getString('honey_level') : 0) ?? 0, 5], color: 'gray' }} />
			</>}
			{item.is('decorated_pot') && item.has('pot_decorations') && <>
				<TextComponent component={''} />
				{item.get('pot_decorations', tag => tag.isList() ? tag.map(e =>
					<TextComponent component={mergeTextComponentStyles(resolver(new ItemStack(Identifier.parse(e.getAsString()), 1)).getHoverName(version), { color: 'gray' })} />
				) : undefined)}
			</>}
			{item.id.path.endsWith('_shulker_box') && <>
				{item.has('container_loot') && (
					<TextComponent component={{ translate: 'container.shulkerBox.unknownContents' }} />
				)}
				{(item.get('container', tag => tag.isList() ? tag.getItems() : []) ?? []).slice(0, 5).map(e => {
					const subItem = resolver(ItemStack.fromNbt(e.isCompound() ? e.getCompound('item') : new NbtCompound()))
					return <TextComponent component={{ translate: 'container.shulkerBox.itemCount', with: [subItem.getHoverName(version), subItem.count] }} />
				})}
				{(item.get('container', tag => tag.isList() ? tag.length : 0) ?? 0) > 5 && (
					<TextComponent component={{ translate: 'container.shulkerBox.more', with: [(item.get('container', tag => tag.isList() ? tag.length : 0) ?? 0) - 5], italic: true }} />
				)}
			</>}
			{/* TODO: spawner and trial spawner */}
		</>}
		{item.showInTooltip('jukebox_playable') && <>
			<TextComponent component={mergeTextComponentStyles(item.get('jukebox_playable', tag => tag.isCompound() ? (
				tag.hasCompound('song')
					? tag.getCompound('song').get('description')?.toSimplifiedJson()
					: { translate: makeDescriptionId('jukebox_song', Identifier.parse(tag.getString('song')))}
			) : {}) ?? {}, { color: 'gray'})} />
		</>}
		{item.showInTooltip('trim') && <>
			<TextComponent component={{ translate: makeDescriptionId('item', Identifier.create('smithing_template.upgrade' )), color: 'gray' }} />
			<TextComponent component={{ text: ' ', extra: [item.get('trim', tag => tag.isCompound() ? (
				tag.hasCompound('pattern')
					? tag.getCompound('pattern').get('description')?.toSimplifiedJson()
					: { translate: makeDescriptionId('trim_pattern', Identifier.parse(tag.getString('pattern'))), color: BUILTIN_TRIM_MATERIALS[tag.getString('material').replace(/^minecraft:/, '')] ?? 'gray' }
			) : '')] }} />
			<TextComponent component={{ text: ' ', extra: [item.get('trim', tag => tag.isCompound() ? (
				tag.hasCompound('material')
					? tag.getCompound('material').get('description')?.toSimplifiedJson()
					: { translate: makeDescriptionId('trim_material', Identifier.parse(tag.getString('material'))), color: BUILTIN_TRIM_MATERIALS[tag.getString('material').replace(/^minecraft:/, '')] ?? 'gray' }
			) : '')] }}/>
		</>}
		{item.showInTooltip('stored_enchantments') && (
			<EnchantmentsTooltip data={item.get('stored_enchantments', tag => tag)} />
		)}
		{item.showInTooltip('enchantments') && (
			<EnchantmentsTooltip data={item.get('enchantments', tag => tag)} />
		)}
		{item.showInTooltip('dyed_color') && (advanced
			? <TextComponent component={{ translate: 'item.color', with: [intToDisplayHexRgb(item.get('dyed_color', tag => tag.isCompound() ? tag.getNumber('rgb') : tag.getAsNumber()))], color: 'gray' }} />
			: <TextComponent component={{ translate: 'item.dyed', color: 'gray' }} />
		)}
		{item.getLore(version).map((component) =>
			<TextComponent component={component} base={{ color: 'dark_purple', italic: true }} />
		)}
		{item.showInTooltip('attribute_modifiers') && (
			<AttributeModifiersTooltip data={item.get('attribute_modifiers', tag => tag)} />
		)}
		{item.showInTooltip('unbreakable') && (
			<TextComponent component={{ translate: 'item.unbreakable', color: 'blue' }} />
		)}
		{item.has('ominous_bottle_amplifier') && (
			<PotionContentsTooltip contents={{ customEffects: [{ effect: Identifier.create('bad_omen'), amplifier: item.get('ominous_bottle_amplifier', tag => tag.getAsNumber()) ?? 0, duration: 120000 }]}} />
		)}
		{/* TODO: creative-only suspicious stew effects */}
		{/* TODO: can break and can place on */}
		{advanced && item.isDamageable() && (
			<TextComponent component={{ translate: 'item.durability', with: [`${item.getMaxDamage() - item.getDamage()}`, `${item.getMaxDamage()}`] }} />
		)}
		{advanced && <>
			<TextComponent component={{ text: item.id.toString(), color: 'dark_gray'}} />
			{item.getSize() > 0 && <TextComponent component={{ translate: 'item.components', with: [item.getSize()], color: 'dark_gray' }} />}
		</>}
	</>
}

const BUILTIN_TRIM_MATERIALS: Record<string, string | undefined> = {
	amethyst: '#9A5CC6',
	copper: '#B4684D',
	diamond: '#6EECD2',
	emerald: '#11A036',
	gold: '#DEB12D',
	iron: '#ECECEC',
	lapis: '#416E97',
	netherite: '#625859',
	quartz: '#E3D4C4',
	redstone: '#971607',
}

const HARMFUL_EFFECTS = new Set([
	'minecraft:slowness',
	'minecraft:mining_fatigue',
	'minecraft:instant_damage',
	'minecraft:nausea',
	'minecraft:blindness',
	'minecraft:hunger',
	'minecraft:weakness',
	'minecraft:poison',
	'minecraft:wither',
	'minecraft:levitation',
	'minecraft:unluck',
	'minecraft:darkness',
	'minecraft:wind_charged',
	'minecraft:weaving',
	'minecraft:oozing',
	'minecraft:infested',
])

function PotionContentsTooltip({ contents, factor }: { contents: PotionContents, factor?: number }) {
	const effects = PotionContents.getAllEffects(contents)
	return <>
		{effects.map(e => {
			const color = HARMFUL_EFFECTS.has(e.effect.toString()) ? 'red' : 'blue'
			let component: any = { translate: makeDescriptionId('effect', e.effect) }
			if (e.amplifier > 0) {
				component = { translate: 'potion.withAmplifier', with: [component, { translate: `potion.potency.${e.amplifier}` }] }
			}
			if (e.duration === -1 || e.duration > 20) {
				component = { translate: 'potion.withDuration', with: [component, formatDuration(e, factor ?? 1)] }
			}
			return <TextComponent component={{ ...component, color }} />
		})}
		{effects.length === 0 && <TextComponent component={{ translate: 'effect.none', color: 'gray' }} />}
	</>
	
}

function formatDuration(effect: MobEffectInstance, factor: number) {
	if (effect.duration === -1) {
		return { translate: 'effect.duration.infinite' }
	}
	const ticks = Math.floor(effect.duration * factor)
	let seconds = Math.floor(ticks / 20)
	let minutes = Math.floor(seconds / 60)
	seconds %= 60
	const hours = Math.floor(minutes / 60)
	minutes %= 60
	return `${hours > 0 ? `${hours}:` : ''}${minutes.toFixed().padStart(2, '0')}:${seconds.toFixed().padStart(2, '0')}`
}

function EnchantmentsTooltip({ data }: { data: NbtTag | undefined }) {
	if (!data || !data.isCompound()) {
		return <></>	
	}
	const levels = data.hasCompound('levels') ? data.getCompound('levels') : data
	return <>
		{[...levels.keys()].map((key) => {
			const level = levels.getNumber(key)
			if (level <= 0) return <></>
			const id = Identifier.parse(key)
			return <TextComponent component={{ translate: makeDescriptionId('enchantment', id), color: id.path.endsWith('_curse') ? 'red' : 'gray', extra: level === 1 ? [] : [' ', { translate: `enchantment.level.${level}` }] }} />
		})}
	</>
}

const EQUIPMENT_GROUPS = [
	'any',
	'mainhand',
	'offhand',
	'hand',
	'feet',
	'legs',
	'chest',
	'head',
	'armor',
	'body',
]

const MODIFIER_OPERATIONS = [
	'add_value',
	'add_multiplied_base',
	'add_multiplied_total',
]

const NEGATIVE_ATTRIBUTES = new Set([
	'minecraft:burning_time',
	'minecraft:fall_damage_multiplier',
])

const NEUTRAL_ATTRIBUTES = new Set([
	'minecraft:gravity',
	'minecraft:scale',
])

function AttributeModifiersTooltip({ data }: { data: NbtTag | undefined }) {
	const modifiers = data?.isList() ? data : data?.isCompound() ? data.getList('modifiers') : new NbtList()

	return <>
		{EQUIPMENT_GROUPS.map(group => {
			let first = true
			return modifiers.map((e) => {
				if (!e.isCompound()) return
				const slot = e.has('slot') ? e.getString('slot') : 'any'
				if (slot !== group) return
				const wasFirst = first
				first = false

				let amount = e.getNumber('amount')
				const type = Identifier.parse(e.getString('type'))
				const id = Identifier.parse(e.getString('id'))
				const operation = MODIFIER_OPERATIONS.indexOf(e.getString('operation'))
				let absolute = false
				if (id.equals(Identifier.create('base_attack_damage'))) {
					amount += 1
					absolute = true
				} else if (id.equals(Identifier.create('base_attack_speed'))) {
					amount += 4
					absolute = true
				}
				if (operation !== 0) {
					amount *= 100
				} else if (type.equals(Identifier.create('knockback_resistance'))) {
					amount *= 10
				}

				return <>
					{wasFirst && <>
						<TextComponent component={''} />
						<TextComponent component={{ translate: `item.modifiers.${group}`, color: 'gray' }} />
					</>}
					{absolute ? (
						<TextComponent component={[' ', { translate: `attribute.modifier.equals.${operation}`, with: [+amount.toFixed(2), { translate: `attribute.name.${type.path}`}], color: 'dark_green' }]} />
					) : amount > 0 ? (
						<TextComponent component={{ translate: `attribute.modifier.plus.${operation}`, with: [+amount.toFixed(2), { translate: `attribute.name.${type.path}`}], color: NEGATIVE_ATTRIBUTES.has(type.toString()) ? 'red' : NEUTRAL_ATTRIBUTES.has(type.toString()) ? 'gray' : 'blue' }} />
					) : amount < 0 ? (
						<TextComponent component={{ translate: `attribute.modifier.take.${operation}`, with: [+(-amount).toFixed(2), { translate: `attribute.name.${type.path}`}], color: NEGATIVE_ATTRIBUTES.has(type.toString()) ? 'blue' : NEUTRAL_ATTRIBUTES.has(type.toString()) ? 'gray' : 'red'}} />
					) : <></>}
				</>
			})
		})}
	</>
}

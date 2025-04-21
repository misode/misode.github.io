import type { NbtTag } from 'deepslate'
import { Identifier, ItemStack } from 'deepslate'
import { safeJsonParse } from '../Utils.js'
import type { VersionId } from './Versions.js'
import { checkVersion } from './Versions.js'

export class ResolvedItem extends ItemStack {

	constructor(
		item: ItemStack,
		public base: ReadonlyMap<string, NbtTag>,
	) {
		super(item.id, item.count, item.components)
	}

	public clone(): ResolvedItem {
		return new ResolvedItem(super.clone(), this.base)
	}

	private getTag(key: string) {
		key = Identifier.parse(key).toString()
		if (this.components.has(key)) {
			return this.components.get(key)
		}
		if (this.components.has(`!${key}`)) {
			return undefined
		}
		return this.base.get(key)
	}

	public get<T>(key: string, reader: (tag: NbtTag) => T) {
		const tag = this.getTag(key)
		return tag === undefined ? undefined : reader(tag)
	}

	public has(key: string) {
		return this.getTag(key) !== undefined
	}

	public set(key: string, tag: NbtTag) {
		key = Identifier.parse(key).toString()
		this.components.set(key, tag)
	}

	public getSize() {
		const keys = new Set(this.base.keys())
		for (const key of this.components.keys()) {
			if (key.startsWith('!')) {
				keys.delete(key.slice(1))
			} else {
				keys.add(key)
			}
		}
		return keys.size
	}

	public getMaxDamage() {
		return this.get('max_damage', tag => tag.getAsNumber()) ?? 0
	}

	public getDamage() {
		return this.get('damage', tag => tag.getAsNumber()) ?? 0
	}

	public isDamageable() {
		return this.has('max_damage') && this.has('damage') && !this.has('unbreakable')
	}

	public isDamaged() {
		return this.isDamageable() && this.getDamage() > 0
	}

	public getMaxStackSize() {
		return this.get('max_stack_size', tag => tag.getAsNumber()) ?? 1
	}

	public isStackable() {
		return this.getMaxStackSize() > 1 && (!this.isDamageable() || !this.isDamaged())
	}

	public isEnchanted() {
		return this.get('enchantments', tag => {
			return tag.isCompound() ? tag.has('levels') ? tag.getCompound('levels').size > 0 : tag.size > 0 : false
		}) ?? false
	}

	public hasFoil() {
		return this.has('enchantment_glint_override') || this.isEnchanted()
	}

	public getLore(version: VersionId) {
		return this.get('lore', tag => {
			return tag.isList() ? tag.map(e => {
				return ResolvedItem.getTextComponent(e, version)
			}) : []
		}) ?? []
	}

	public showInTooltip(key: string) {
		return this.get(key, tag => {
			return tag.isCompound() && tag.has('show_in_tooltip') ? tag.getBoolean('show_in_tooltip') !== false : true
		}) ?? false
	}

	public getRarity() {
		const rarity = this.get('rarity', tag => tag.isString() ? tag.getAsString() : undefined) ?? 'common'
		if (!this.isEnchanted()) {
			return rarity
		}
		if (rarity === 'common' || rarity === 'uncommon') {
			return 'rare'
		}
		if (rarity === 'rare') {
			return 'epic'
		}
		return rarity
	}

	public getRarityColor() {
		const rarity = this.getRarity()
		if (rarity === 'epic') {
			return 'light_purple'
		} else if (rarity === 'rare') {
			return 'aqua'
		} else if (rarity === 'uncommon') {
			return 'yellow'
		} else {
			return 'white'
		}
	}

	public getHoverName(version: VersionId) {
		const customName = this.get('custom_name', tag => ResolvedItem.getTextComponent(tag, version))
		if (customName) {
			return customName
		}

		const bookTitle = this.get('written_book_content', tag => tag.isCompound() ? (tag.hasCompound('title') ? tag.getCompound('title').getString('raw') : tag.getString('title')) : undefined)
		if (bookTitle && bookTitle.length > 0) {
			return { text: bookTitle }
		}

		const itemName = this.get('item_name', tag => ResolvedItem.getTextComponent(tag, version))
		if (itemName) {
			return itemName
		}

		const guess = this.id.path
			.replace(/[_\/]/g, ' ')
			.split(' ')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ')
		return { text: guess }
	}

	public getStyledHoverName(version: VersionId) {
		return { text: '', extra: [this.getHoverName(version)], color: this.getRarityColor(), italic: this.has('custom_name') }
	}

	public getDisplayName(version: VersionId) {
		// Does not use translation key "chat.square_brackets" due to limitations of TextComponent
		return { text: '[', extra: [this.getStyledHoverName(version), ']'], color: this.getRarityColor() }
	}

	public getChargedProjectile() {
		return this.get('charged_projectiles', tag => {
			if (!tag.isList() || tag.length === 0) {
				return undefined
			}
			return ItemStack.fromNbt(tag.getCompound(0))
		})
	}

	private static getTextComponent(tag: NbtTag, version: VersionId) {
		if (!checkVersion(version, '1.21.5')) {
			return safeJsonParse(tag.getAsString()) ?? { text: '(invalid text component)' }
		}
		return tag.toSimplifiedJson()
	}
}

import type { NbtTag } from 'deepslate'
import { Identifier, ItemStack } from 'deepslate'

export class ResolvedItem extends ItemStack {

	constructor(
		item: ItemStack,
		public base: ReadonlyMap<string, NbtTag>,
	) {
		super(item.id, item.count, item.components)
	}

	public static create(id: string | Identifier, count: number, components: Map<string, NbtTag>, baseGetter: (id: string) => ReadonlyMap<string, NbtTag>) {
		if (typeof id === 'string') {
			id = Identifier.parse(id)
		}
		const item = new ItemStack(id, count, components)
		return new ResolvedItem(item, baseGetter(id.toString()))
	}

	public clone(): ResolvedItem {
		return new ResolvedItem(super.clone(), this.base)
	}

	public flatten(): ItemStack {
		const components = new Map(this.base)
		for (const [key, value] of this.components) {
			if (key.startsWith('!')) {
				components.delete(key.slice(1))
			} else {
				components.set(key, value)
			}
		}
		return new ItemStack(this.id, this.count, components)
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

	public getLore() {
		return this.get('lore', tag => {
			return tag.isList() ? tag.map(e => {
				try {
					return JSON.parse(e.getAsString())
				} catch (e) {
					return { text: '(invalid lore line)' }
				}
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

	public getHoverName() {
		const customName = this.get('custom_name', tag => tag.isString() ? tag.getAsString() : undefined)
		if (customName) {
			try {
				return JSON.parse(customName)
			} catch (e) {
				return '(invalid custom name)'
			}
		}

		const bookTitle = this.get('written_book_content', tag => tag.isCompound() ? (tag.hasCompound('title') ? tag.getCompound('title').getString('raw') : tag.getString('title')) : undefined)
		if (bookTitle && bookTitle.length > 0) {
			return { text: bookTitle }
		}

		const itemName = this.get('item_name', tag => tag.isString() ? tag.getAsString() : undefined)
		if (itemName) {
			try {
				return JSON.parse(itemName)
			} catch (e) {
				return { text: '(invalid item name)' }
			}
		}

		const guess = this.id.path
			.replace(/[_\/]/g, ' ')
			.split(' ')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ')
		return { text: guess }
	}

	public getStyledHoverName() {
		return { text: '', extra: [this.getHoverName()], color: this.getRarityColor(), italic: this.has('custom_name') }
	}

	public getDisplayName() {
		// Does not use translation key "chat.square_brackets" due to limitations of TextComponent
		return { text: '[', extra: [this.getStyledHoverName(), ']'], color: this.getRarityColor() }
	}

	public getChargedProjectile() {
		return this.get('charged_projectiles', tag => {
			if (!tag.isList() || tag.length === 0) {
				return undefined
			}
			return ItemStack.fromNbt(tag.getCompound(0))
		})
	}
}

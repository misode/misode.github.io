import { Identifier, ItemStack } from 'deepslate/core'
import type { VersionId } from '../../services/Versions.js'
import { checkVersion } from '../../services/Versions.js'
import { jsonToNbt } from '../../Utils.js'

export function placeItems(version: VersionId, recipe: any, animation: number, itemTags: Map<string, any>): Map<string, ItemStack> {
	const items = new Map<string, ItemStack>()
	const type: string = recipe.type?.replace(/^minecraft:/, '')
	if (!type || type.startsWith('crafting_special') || type === 'crafting_decorated_pot') {
		return items
	}

	if (type === 'crafting_shapeless') {
		const ingredients: any[] = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
		ingredients.forEach((ingredient, i) => {
			const choices = allIngredientChoices(version, ingredient, itemTags)
			if (i >= 0 && i < 9 && choices.length > 0) {
				const choice = choices[(3 * i + animation) % choices.length]
				items.set(`crafting.${i}`, choice)
			}
		})
	} else if (type === 'crafting_shaped') {
		const keys = new Map<string, ItemStack>()
		for (const [key, ingredient] of Object.entries(recipe.key ?? {})) {
			const choices = allIngredientChoices(version, ingredient, itemTags)
			if (choices.length > 0) {
				const choice = choices[animation % choices.length]
				keys.set(key, choice)
			}
		}
		const pattern = Array.isArray(recipe.pattern) ? recipe.pattern : []
		for (let row = 0; row < Math.min(3, pattern.length); row += 1) {
			for (let col = 0; col < Math.min(3, pattern[row].length); col += 1) {
				const key = pattern[row].split('')[col]
				const choice = key === ' ' ? undefined : keys.get(key)
				if (choice) {
					items.set(`crafting.${row * 3 + col}`, choice)
				}
			}
		}
	} else if (type === 'crafting_transmute') {
		const inputs = allIngredientChoices(version, recipe.input, itemTags)
		if (inputs.length > 0) {
			const choice = inputs[animation % inputs.length]
			items.set('crafting.0', choice)
		}
		const materials = allIngredientChoices(version, recipe.material, itemTags)
		if (materials.length > 0) {
			const choice = materials[animation % materials.length]
			items.set('crafting.1', choice)
		}
	} else if (type === 'smelting' || type === 'smoking' || type === 'blasting' || type === 'campfire_cooking') {
		const choices = allIngredientChoices(version, recipe.ingredient, itemTags)
		if (choices.length > 0) {
			const choice = choices[animation % choices.length]
			items.set('smelting.ingredient', choice)
		}
	} else if (type === 'stonecutting') {
		const choices = allIngredientChoices(version, recipe.ingredient, itemTags)
		if (choices.length > 0) {
			const choice = choices[animation % choices.length]
			items.set('stonecutting.ingredient', choice)
		}
	} else if (type === 'smithing_transform' || type === 'smithing_trim') {
		for (const ingredient of ['template', 'base', 'addition'] as const) {
			const choices = allIngredientChoices(version, recipe[ingredient], itemTags)
			if (choices.length > 0) {
				const choice = choices[animation % choices.length]
				items.set(`smithing.${ingredient}`, choice)
			}
		}
	}

	let resultSlot = 'crafting.result'
	if (type === 'smelting' || type === 'smoking' || type === 'blasting' || type === 'campfire_cooking') {
		resultSlot = 'smelting.result'
	} else if (type === 'stonecutting') {
		resultSlot = 'stonecutting.result'
	} else if (type === 'smithing_transform' || type === 'smithing_trim') {
		resultSlot = 'smithing.result'
	}
	const result = recipe.result
	if (type === 'smithing_trim') {
		const base = items.get('smithing.base')
		if (base) {
			items.set(resultSlot, base)
		}
	} else if (typeof result === 'string') {
		items.set(resultSlot, new ItemStack(Identifier.parse(result), 1))
	} else if (typeof result === 'object' && result !== null) {
		const id = typeof result.id === 'string' ? result.id
			: typeof result.item === 'string' ? result.item
				: 'minecraft:air'
		if (id !== 'minecraft:air') {
			const count = typeof result.count === 'number' ? result.count : 1
			const components = new Map(Object.entries(result.components ?? {})
				.map(([k, v]) => [k, jsonToNbt(v)]))
			items.set(resultSlot, new ItemStack(Identifier.parse(id), count, components))
		}
	}

	return items
}

function allIngredientChoices(version: VersionId, ingredient: any, itemTags: Map<string, any>): ItemStack[] {
	if (Array.isArray(ingredient)) {
		return ingredient.flatMap(i => allIngredientChoices(version, i, itemTags))
	}

	if (checkVersion(version, '1.21.2')) {
		if (ingredient !== null) {
			if (typeof ingredient === 'string') {
				if (ingredient.startsWith('#')) {
					return parseTag(version, ingredient.slice(1), itemTags)
				}
				return [new ItemStack(Identifier.parse(ingredient), 1)]
			}
		}

		return [new ItemStack(Identifier.create('stone'), 1)]
	} else {
		if (typeof ingredient === 'object' && ingredient !== null) {
			if (typeof ingredient.item === 'string') {
				return [new ItemStack(Identifier.parse(ingredient.item), 1)]
			} else if (typeof ingredient.tag === 'string') {
				return parseTag(version, ingredient.tag, itemTags)
			}
		}
	}

	return []
}

function parseTag(version: VersionId, tagId: any, itemTags: Map<string, any>): ItemStack[] {
	const tag: any = itemTags.get(tagId.replace(/^minecraft:/, ''))
	if (typeof tag === 'object' && tag !== null && Array.isArray(tag.values)) {
		return tag.values.flatMap((value: any) => {
			if (typeof value !== 'string') return []
			if (value.startsWith('#')) return parseTag(version, value.slice(1), itemTags)
			return [new ItemStack(Identifier.parse(value), 1)]
		})
	}
	return []
}

import { DataModel } from '@mcschema/core'
import { Identifier, ItemStack } from 'deepslate'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { useLocale } from '../../contexts/index.js'
import { useAsync } from '../../hooks/useAsync.js'
import type { VersionId } from '../../services/index.js'
import { checkVersion, fetchAllPresets } from '../../services/index.js'
import { jsonToNbt } from '../../Utils.js'
import { Btn, BtnMenu } from '../index.js'
import { ItemDisplay } from '../ItemDisplay.jsx'
import type { PreviewProps } from './index.js'

const ANIMATION_TIME = 1000

export const RecipePreview = ({ data, version }: PreviewProps) => {
	const { locale } = useLocale()
	const [advancedTooltips, setAdvancedTooltips] = useState(true)
	const [animation, setAnimation] = useState(0)
	const overlay = useRef<HTMLDivElement>(null)

	const { value: itemTags } = useAsync(() => {
		return fetchAllPresets(version, 'tag/item')
	}, [version])

	useEffect(() => {
		const interval = setInterval(() => {
			setAnimation(n => n + 1)	
		}, ANIMATION_TIME)
		return () => clearInterval(interval)
	}, [])

	const recipe = DataModel.unwrapLists(data)
	const state = JSON.stringify(recipe)
	const items = useMemo<Map<Slot, ItemStack>>(() => {
		return placeItems(version, recipe, animation, itemTags ?? new Map())
	}, [state, animation, itemTags])

	const gui = useMemo(() => {
		const type = recipe.type?.replace(/^minecraft:/, '')
		if (type === 'smelting' || type === 'blasting' || type === 'smoking' || type === 'campfire_cooking') {
			return '/images/furnace.png'
		} else if (type === 'stonecutting') {
			return '/images/stonecutter.png'
		} else if (type === 'smithing_transform' || type === 'smithing_trim') {
			return '/images/smithing.png'
		} else {
			return '/images/crafting_table.png'
		}
	}, [state])

	return <>
		<div ref={overlay} class="preview-overlay">
			<img src={gui} alt="Crafting GUI" class="pixelated" draggable={false} />
			{[...items.entries()].map(([slot, item]) =>
				<div key={slot} style={slotStyle(slot)}>
					<ItemDisplay item={item} slotDecoration={true} advancedTooltip={advancedTooltips} />
				</div>
			)}
		</div>
		<div class="controls preview-controls">
			<BtnMenu icon="gear" tooltip={locale('settings')} >
				<Btn icon={advancedTooltips ? 'square_fill' : 'square'} label="Advanced tooltips" onClick={e => {setAdvancedTooltips(!advancedTooltips); e.stopPropagation()}} />
			</BtnMenu>
		</div>
	</>
}

const GUI_WIDTH = 176
const GUI_HEIGHT = 81
const SLOT_SIZE = 18
const SLOTS = {
	'crafting.0': [29, 16],
	'crafting.1': [47, 16],
	'crafting.2': [65, 16],
	'crafting.3': [29, 34],
	'crafting.4': [47, 34],
	'crafting.5': [65, 34],
	'crafting.6': [29, 52],
	'crafting.7': [47, 52],
	'crafting.8': [65, 52],
	'crafting.result': [123, 34],
	'smelting.ingredient': [55, 16],
	'smelting.fuel': [55, 53],
	'smelting.result': [115, 34],
	'stonecutting.ingredient': [19, 32],
	'stonecutting.result': [142, 32],
	'smithing.template': [7, 47],
	'smithing.base': [25, 47],
	'smithing.addition': [43, 47],
	'smithing.result': [97, 47],
}
type Slot = keyof typeof SLOTS

function slotStyle(slot: Slot) {
	const [x, y] = SLOTS[slot]
	return {
		left: `${x*100/GUI_WIDTH}%`,
		top: `${y*100/GUI_HEIGHT}%`,
		width: `${SLOT_SIZE*100/GUI_WIDTH}%`,
		height: `${SLOT_SIZE*100/GUI_HEIGHT}%`,
	}
}

function placeItems(version: VersionId, recipe: any, animation: number, itemTags: Map<string, any>) {
	const items = new Map<Slot, ItemStack>()
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
				items.set(`crafting.${i}` as Slot, choice)
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
					items.set(`crafting.${row * 3 + col}` as Slot, choice)
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
			items.set('smelting.ingredient' as Slot, choice)
		}
	} else if (type === 'stonecutting') {
		const choices = allIngredientChoices(version, recipe.ingredient, itemTags)
		if (choices.length > 0) {
			const choice = choices[animation % choices.length]
			items.set('stonecutting.ingredient' as Slot, choice)
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

	let resultSlot: Slot = 'crafting.result'
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

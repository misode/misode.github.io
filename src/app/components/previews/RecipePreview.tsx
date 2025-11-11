import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { useLocale, useVersion } from '../../contexts/index.js'
import { useAsync } from '../../hooks/useAsync.js'
import { checkVersion, fetchAllPresets } from '../../services/index.js'
import { safeJsonParse } from '../../Utils.js'
import { Btn, BtnMenu } from '../index.js'
import { ItemDisplay } from '../ItemDisplay.jsx'
import { ItemDisplay1204 } from '../ItemDisplay1204.jsx'
import type { PreviewProps } from './index.js'
import { placeItems } from './Recipe.js'
import { placeItems as placeItems1204 } from './Recipe1204.js'

const ANIMATION_TIME = 1000

export const RecipePreview = ({ docAndNode }: PreviewProps) => {
	const { locale } = useLocale()
	const { version } = useVersion()
	const use1204 = !checkVersion(version, '1.20.5')
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

	const text = docAndNode.doc.getText()
	const recipe = safeJsonParse(text) ?? {}
	const items = useMemo(() => {
		if (use1204) {
			return placeItems1204(version, recipe, animation, itemTags ?? new Map())
		}
		return placeItems(version, recipe, animation, itemTags ?? new Map())
	}, [use1204, text, animation, itemTags])

	const gui = useMemo(() => {
		const type = recipe?.type?.replace(/^minecraft:/, '')
		if (type === 'smelting' || type === 'blasting' || type === 'smoking' || type === 'campfire_cooking') {
			return '/images/furnace.png'
		} else if (type === 'stonecutting') {
			return '/images/stonecutter.png'
		} else if (type === 'smithing_transform' || type === 'smithing_trim') {
			return '/images/smithing.png'
		} else {
			return '/images/crafting_table.png'
		}
	}, [text])

	return <>
		<div ref={overlay} class="preview-overlay">
			<img src={gui} alt="Crafting GUI" class="pixelated" draggable={false} />
			{[...items.entries()].map(([slot, item]) =>
				<div key={slot} style={slotStyle(slot)}>
					{use1204
						? <ItemDisplay1204 item={item as any} slotDecoration={true} advancedTooltip={advancedTooltips} />
						: <ItemDisplay item={item as any} slotDecoration={true} advancedTooltip={advancedTooltips} />}
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
const SLOTS: Record<string, [number, number]> = {
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

function slotStyle(slot: string) {
	const [x, y] = SLOTS[slot] ?? [0, 0]
	return {
		left: `${x*100/GUI_WIDTH}%`,
		top: `${y*100/GUI_HEIGHT}%`,
		width: `${SLOT_SIZE*100/GUI_WIDTH}%`,
		height: `${SLOT_SIZE*100/GUI_HEIGHT}%`,
	}
}

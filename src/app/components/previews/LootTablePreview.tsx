import { DataModel } from '@mcschema/core'
import { useEffect, useRef, useState } from 'preact/hooks'
import { useLocale, useVersion } from '../../contexts/index.js'
import type { Item } from '../../previews/LootTable.js'
import { generateLootTable } from '../../previews/LootTable.js'
import { clamp, randomSeed } from '../../Utils.js'
import { Btn } from '../index.js'
import { ItemDisplay } from '../ItemDisplay.jsx'
import type { PreviewProps } from './index.js'

interface SlottedItem {
	slot: number,
	item: Item,
}

export const LootTablePreview = ({ data }: PreviewProps) => {
	const { locale } = useLocale()
	const { version } = useVersion()
	const [seed, setSeed] = useState(randomSeed())
	const overlay = useRef<HTMLDivElement>(null)

	const [items, setItems] = useState<SlottedItem[]>([])

	const table = DataModel.unwrapLists(data)
	const state = JSON.stringify(table)
	useEffect(() => {
		const items = generateLootTable(table, { version, seed })
		console.log('Generated items!', table, items)
		setItems(items.map((item, i) => ({ slot: i, item })))
	}, [version, seed, state])

	return <>
		<div ref={overlay} class="preview-overlay">
			<img src="/images/container.png" alt="Container background" class="pixelated" draggable={false} />
			{items.map(({ slot, item }) =>
				<div key={slot} style={slotStyle(slot)}>
					<ItemDisplay item={item} advancedTooltip={true} />
				</div>
			)}
		</div>
		<div class="controls preview-controls">
			<Btn icon="sync" tooltip={locale('generate_new_seed')} onClick={() => setSeed(randomSeed())} />
		</div>
	</>
}

const GUI_WIDTH = 176
const GUI_HEIGHT = 81
const SLOT_SIZE = 18

function slotStyle(slot: number) {
	slot = clamp(slot, 0, 26)
	const x = (slot % 9) * SLOT_SIZE + 7
	const y = (Math.floor(slot / 9)) * SLOT_SIZE + 20
	return {
		left: `${x*100/GUI_WIDTH}%`,
		top: `${y*100/GUI_HEIGHT}%`,
		width: `${SLOT_SIZE*100/GUI_WIDTH}%`,
		height: `${SLOT_SIZE*100/GUI_HEIGHT}%`,
	}
}

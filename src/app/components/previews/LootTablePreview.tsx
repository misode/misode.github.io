import { DataModel } from '@mcschema/core'
import { useEffect, useRef, useState } from 'preact/hooks'
import { useLocale, useVersion } from '../../contexts/index.js'
import { clamp, randomSeed } from '../../Utils.js'
import { Btn, BtnMenu, NumberInput } from '../index.js'
import { ItemDisplay } from '../ItemDisplay.jsx'
import type { PreviewProps } from './index.js'
import type { SlottedItem } from './LootTable.js'
import { generateLootTable } from './LootTable.js'

export const LootTablePreview = ({ data }: PreviewProps) => {
	const { locale } = useLocale()
	const { version } = useVersion()
	const [seed, setSeed] = useState(randomSeed())
	const [luck, setLuck] = useState(0)
	const [daytime, setDaytime] = useState(0)
	const [weather, setWeather] = useState('clear')
	const [mixItems, setMixItems] = useState(true)
	const [advancedTooltips, setAdvancedTooltips] = useState(true)
	const overlay = useRef<HTMLDivElement>(null)

	const [items, setItems] = useState<SlottedItem[]>([])

	const table = DataModel.unwrapLists(data)
	const state = JSON.stringify(table)
	useEffect(() => {
		const items = generateLootTable(table, { version, seed, luck, daytime, weather, stackMixer: mixItems ? 'container' : 'default' })
		console.log('Generated loot', items)
		setItems(items)
	}, [version, seed, luck, daytime, weather, mixItems, state])

	return <>
		<div ref={overlay} class="preview-overlay">
			<img src="/images/container.png" alt="Container background" class="pixelated" draggable={false} />
			{items.map(({ slot, item }) =>
				<div key={slot} style={slotStyle(slot)}>
					<ItemDisplay item={item} slotDecoration={true} advancedTooltip={advancedTooltips} />
				</div>
			)}
		</div>
		<div class="controls preview-controls">
			<BtnMenu icon="gear" tooltip={locale('settings')} >
				<div class="btn btn-input" onClick={e => e.stopPropagation()}>
					<span>{locale('preview.luck')}</span>
					<NumberInput value={luck} onChange={setLuck} />
				</div>
				<div class="btn btn-input" onClick={e => e.stopPropagation()}>
					<span>{locale('preview.daytime')}</span>
					<NumberInput value={daytime} onChange={setDaytime} />
				</div>
				<div class="btn btn-input" onClick={e => e.stopPropagation()}>
					<span>{locale('preview.weather')}</span>
					<select value={weather} onChange={e => setWeather((e.target as HTMLSelectElement).value)} >
						{['clear', 'rain', 'thunder'].map(v =>
							<option value={v}>{locale(`preview.weather.${v}`)}</option>)}
					</select>
				</div>
				<Btn icon={mixItems ? 'square_fill' : 'square'} label="Fill container randomly" onClick={e => {setMixItems(!mixItems); e.stopPropagation()}} />
				<Btn icon={advancedTooltips ? 'square_fill' : 'square'} label="Advanced tooltips" onClick={e => {setAdvancedTooltips(!advancedTooltips); e.stopPropagation()}} />
			</BtnMenu>
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

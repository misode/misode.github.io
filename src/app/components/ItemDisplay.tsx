import { useEffect, useRef, useState } from 'preact/hooks'
import { useVersion } from '../contexts/Version.jsx'
import { useAsync } from '../hooks/useAsync.js'
import type { Item } from '../previews/LootTable.js'
import { MaxDamageItems } from '../previews/LootTable.js'
import { getAssetUrl } from '../services/DataFetcher.js'
import { renderItem } from '../services/Resources.js'
import { getCollections } from '../services/Schemas.js'
import { ItemTooltip } from './ItemTooltip.jsx'
import { Octicon } from './Octicon.jsx'

interface Props {
	item: Item,
	slotDecoration?: boolean,
	advancedTooltip?: boolean,
}
export function ItemDisplay({ item, slotDecoration, advancedTooltip }: Props) {
	const el = useRef<HTMLDivElement>(null)
	const [tooltipOffset, setTooltipOffset] = useState<[number, number]>([0, 0])
	const [tooltipSwap, setTooltipSwap] = useState(false)

	useEffect(() => {
		const onMove = (e: MouseEvent) => {
			requestAnimationFrame(() => {
				const { right, width } = el.current!.getBoundingClientRect()
				const swap = right + 200 > document.body.clientWidth
				setTooltipSwap(swap)
				setTooltipOffset([(swap ? width - e.offsetX : e.offsetX) + 20, e.offsetY - 40])
			})
		}
		el.current?.addEventListener('mousemove', onMove)
		return () => el.current?.removeEventListener('mousemove', onMove)
	}, [])

	const maxDamage = MaxDamageItems.get(item.id)

	return <div class="item-display" ref={el}>
		<ItemItself item={item} />
		{item.count !== 1 && <>
			<svg class="item-count" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMinYMid meet">
				<text x="95" y="93" font-size="50" textAnchor="end" fontFamily="MinecraftSeven" fill="#373737">{item.count}</text>
				<text x="90" y="88" font-size="50" textAnchor="end" fontFamily="MinecraftSeven" fill="#ffffff">{item.count}</text>
			</svg>
		</>}
		{slotDecoration && <>
			{(maxDamage && (item.tag?.Damage ?? 0) > 0) && <svg class="item-durability" width="100%" height="100%" viewBox="0 0 18 18">
				<rect x="3" y="14" width="13" height="2" fill="#000" />
				<rect x="3" y="14" width={`${(maxDamage - item.tag.Damage) / maxDamage * 13}`} height="1" fill={`hsl(${(maxDamage - item.tag.Damage) / maxDamage * 120}deg, 100%, 50%)`} />
			</svg>}
			<div class="item-slot-overlay"></div>
		</>}
		<ItemTooltip {...item} advanced={advancedTooltip} offset={tooltipOffset} swap={tooltipSwap} />
	</div>
}

function ItemItself({ item }: Props) {
	const { version } = useVersion()
	const [errored, setErrored] = useState(false)

	const isEnchanted = (item.tag?.Enchantments?.length ?? 0) > 0 || (item.tag?.StoredEnchantments?.length ?? 0) > 0

	if (errored || (item.id.includes(':') && !item.id.startsWith('minecraft:'))) {
		return Octicon.package
	}

	const { value: collections } = useAsync(() => getCollections(version), [])

	if (collections === undefined) {
		return null
	}

	const texturePath = `item/${item.id.replace(/^minecraft:/, '')}`
	if (collections.get('texture').includes('minecraft:' + texturePath)) {
		const src = getAssetUrl(version, 'textures', texturePath)
		return <>
			<img src={src} alt="" onError={() => setErrored(true)} draggable={false} />
			{isEnchanted && <div class="item-glint" style={{'--mask-image': `url("${src}")`}}></div>}
		</>
	}

	const modelPath = `item/${item.id.replace(/^minecraft:/, '')}`
	if (collections.get('model').includes('minecraft:' + modelPath)) {
		return <RenderedItem item={item} isEnchanted={isEnchanted} />
	}

	return Octicon.package
}

function RenderedItem({ item, isEnchanted }: Props & { isEnchanted: boolean }) {
	const { version } = useVersion()
	const { value: src } = useAsync(() => renderItem(version, item.id), [version, item])

	if (src) {
		return <>
			<img src={src} alt={item.id} class="model" draggable={false} />
			{isEnchanted && <div class="item-glint" style={{'--mask-image': `url("${src}")`}}></div>}
		</>
	}

	return <div class="item-display">
		{Octicon.package}
	</div>
}

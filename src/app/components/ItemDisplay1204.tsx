import type { ItemStack } from 'deepslate-1.20.4/core'
import { Identifier } from 'deepslate-1.20.4/core'
import { useEffect, useRef, useState } from 'preact/hooks'
import { useVersion } from '../contexts/Version.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { renderItem } from '../services/Resources1204.js'
import { getCollections } from '../services/Schemas.js'
import { ItemTooltip1204 } from './ItemTooltip1204.jsx'
import { Octicon } from './Octicon.jsx'
import { itemHasGlint } from './previews/LootTable1204.js'

interface Props {
	item: ItemStack,
	slotDecoration?: boolean,
	tooltip?: boolean,
	advancedTooltip?: boolean,
}
export function ItemDisplay1204({ item, slotDecoration, tooltip, advancedTooltip }: Props) {
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

	const maxDamage = item.getItem().durability

	return <div class="item-display" ref={el}>
		<ItemItself item={item} />
		{item.count !== 1 && <>
			<svg class="item-count" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMinYMid meet">
				<text x="95" y="93" font-size="50" textAnchor="end" fontFamily="MinecraftSeven" fill="#373737">{item.count}</text>
				<text x="90" y="88" font-size="50" textAnchor="end" fontFamily="MinecraftSeven" fill="#ffffff">{item.count}</text>
			</svg>
		</>}
		{slotDecoration && <>
			{(maxDamage && item.tag.getNumber('Damage') > 0) && <svg class="item-durability" width="100%" height="100%" viewBox="0 0 18 18">
				<rect x="3" y="14" width="13" height="2" fill="#000" />
				<rect x="3" y="14" width={`${(maxDamage - item.tag.getNumber('Damage')) / maxDamage * 13}`} height="1" fill={`hsl(${(maxDamage - item.tag.getNumber('Damage')) / maxDamage * 120}deg, 100%, 50%)`} />
			</svg>}
			<div class="item-slot-overlay"></div>
		</>}
		{tooltip !== false && <div class="item-tooltip" style={tooltipOffset && {
			left: (tooltipSwap ? undefined : `${tooltipOffset[0]}px`),
			right: (tooltipSwap ? `${tooltipOffset[0]}px` : undefined),
			top: `${tooltipOffset[1]}px`,
		}}>
			<ItemTooltip1204 item={item} advanced={advancedTooltip} />
		</div>}
	</div>
}

function ItemItself({ item }: Props) {
	const { version } = useVersion()

	const hasGlint = itemHasGlint(item)

	if (item.id.namespace !== Identifier.DEFAULT_NAMESPACE) {
		return Octicon.package
	}

	const { value: collections } = useAsync(() => getCollections(version), [])

	if (collections === undefined) {
		return null
	}

	const modelPath = `item/${item.id.path}`
	if (collections.get('model').includes('minecraft:' + modelPath)) {
		return <RenderedItem item={item} hasGlint={hasGlint} />
	}

	return Octicon.package
}

function RenderedItem({ item, hasGlint }: Props & { hasGlint: boolean }) {
	const { version } = useVersion()
	const { value: src } = useAsync(() => renderItem(version, item), [version, item])

	if (src) {
		return <>
			<img src={src} alt={item.id.toString()} class="model" draggable={false} />
			{hasGlint && <div class="item-glint" style={{'--mask-image': `url("${src}")`}}></div>}
		</>
	}

	return <div class="item-display">
		{Octicon.package}
	</div>
}

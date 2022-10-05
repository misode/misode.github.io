import { useState } from 'preact/hooks'
import { useVersion } from '../contexts/Version.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { getAssetUrl } from '../services/DataFetcher.js'
import { renderItem } from '../services/Resources.js'
import { getCollections } from '../services/Schemas.js'
import { Octicon } from './Octicon.jsx'

interface Props {
	item: string,
	count?: number,
}
export function ItemDisplay({ item, count = 1 }: Props) {
	return <div class="item-display">
		<ItemItself item={item} />
		{count !== 1 && <>
			<svg class="item-count" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMinYMid meet">
				<text x="95" y="93" font-size="50" textAnchor="end" fontFamily="MinecraftSeven" fill="#373737">{count}</text>
				<text x="90" y="88" font-size="50" textAnchor="end" fontFamily="MinecraftSeven" fill="#ffffff">{count}</text>
			</svg>
		</>}
	</div>
}

function ItemItself({ item }: Props) {
	const { version } = useVersion()
	const [errored, setErrored] = useState(false)

	if (errored || (item.includes(':') && !item.startsWith('minecraft:'))) {
		return Octicon.package
	}

	const { value: collections } = useAsync(() => getCollections(version), [])

	if (collections === undefined) {
		return null
	}

	const texturePath = `item/${item.replace(/^minecraft:/, '')}`
	if (collections.get('texture').includes('minecraft:' + texturePath)) {
		return <img src={getAssetUrl(version, 'textures', texturePath)} alt="" onError={() => setErrored(true)} draggable={false} />
	}

	const modelPath = `block/${item.replace(/^minecraft:/, '')}`
	if (collections.get('model').includes('minecraft:' + modelPath)) {
		return <RenderedItem item={item} />
	}

	return Octicon.package
}

function RenderedItem({ item }: Props) {
	const { version } = useVersion()
	const { value: src } = useAsync(() => renderItem(version, item), [version, item])

	if (src) {
		return <img src={src} alt={item} class="model" draggable={false} />
	}

	return <div class="item-display">
		{Octicon.package}
	</div>
}

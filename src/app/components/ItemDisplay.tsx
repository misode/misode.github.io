import { useState } from 'preact/hooks'
import { useVersion } from '../contexts/Version.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { getAssetUrl } from '../services/DataFetcher.js'
import { renderItem } from '../services/Resources.js'
import { getCollections } from '../services/Schemas.js'
import { Octicon } from './Octicon.jsx'

interface Props {
	item: string,
}
export function ItemDisplay({ item }: Props) {
	const { version } = useVersion()
	const [errored, setErrored] = useState(false)

	if (errored || (item.includes(':') && !item.startsWith('minecraft:'))) {
		return <div class="item-display">
			{Octicon.package}
		</div>
	}

	const { value: collections } = useAsync(() => getCollections(version), [])

	if (collections === undefined) {
		return <div class="item-display"></div>
	}

	const texturePath = `item/${item.replace(/^minecraft:/, '')}`
	if (collections.get('texture').includes('minecraft:' + texturePath)) {
		return <div class="item-display">
			<img src={getAssetUrl(version, 'textures', texturePath)} alt="" onError={() => setErrored(true)} />
		</div>
	}

	const modelPath = `block/${item.replace(/^minecraft:/, '')}`
	if (collections.get('model').includes('minecraft:' + modelPath)) {
		return <div class="item-display">
			<RenderedItem item={item} />
		</div>
	}

	return <div class="item-display">
		{Octicon.package}
	</div>
}

function RenderedItem({ item }: Props) {
	const { version } = useVersion()
	const { value: src } = useAsync(() => renderItem(version, item), [version, item])

	if (src) {
		return <img src={src} alt={item} />
	}

	return <div class="item-display">
		{Octicon.package}
	</div>
}

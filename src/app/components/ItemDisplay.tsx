import { useState } from 'preact/hooks'
import { useVersion } from '../contexts/Version.jsx'
import { getTextureUrl } from '../services/DataFetcher.js'
import { CachedCollections } from '../services/Schemas.js'
import { Octicon } from './Octicon.jsx'

interface Props {
	item: string,
}
export function ItemDisplay({ item }: Props) {
	return <div class="item-display">
		<Display item={item} />
	</div>
}

function Display({ item }: Props) {
	const { version } = useVersion()
	const [errored, setErrored] = useState(false)

	if (errored) {
		return Octicon.alert
	}

	if (item.includes(':') && !item.startsWith('minecraft:')) {
		return Octicon.package
	}
	
	const itemTexture = `item/${item.replace(/^minecraft:/, '')}`
	if (CachedCollections.get('texture').includes('minecraft:' + itemTexture)) {
		return <img src={getTextureUrl(version, itemTexture)} alt="" onError={() => setErrored(true)} />
	}

	return Octicon.package
}

import { Identifier, ItemRenderer } from 'deepslate'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { useVersion } from '../contexts/Version.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { getAssetUrl } from '../services/DataFetcher.js'
import { getResources } from '../services/Resources.js'
import { getCollections } from '../services/Schemas.js'
import { Octicon } from './Octicon.jsx'

const RENDER_SIZE = 128

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
	const canvas = useRef<HTMLCanvasElement>(null)
	const { version } = useVersion()

	const [loaded, setLoaded] = useState(false)

	const { value: resources } = useAsync(() => getResources(version), [item])

	const gl = useMemo(() => {
		if (!canvas.current) return undefined
		return canvas.current?.getContext('webgl2') ?? undefined
	}, [canvas.current])

	const renderer = useMemo(() => {
		if (!resources || !gl) return undefined
		return new ItemRenderer(gl, Identifier.parse(item), resources, {})
	}, [resources, gl])

	useEffect(() => {
		if (renderer) {
			renderer.setItem(Identifier.parse(item))
			renderer.setViewport(0, 0, RENDER_SIZE, RENDER_SIZE)
			renderer.drawItem()
			setLoaded(true)
		}
	}, [renderer, item])

	return <>
		<canvas ref={canvas} width={RENDER_SIZE} height={RENDER_SIZE} style={loaded ? undefined : {display: 'none'}}/>
		{!loaded && <div class="item-display">
			{Octicon.package}
		</div>}
	</>
}

import type { DataModel } from '@mcschema/core'
import { Path } from '@mcschema/core'
import { useState } from 'preact/hooks'
import { useModel } from '../../hooks'
import type { VersionId } from '../../services'
import { checkVersion } from '../../services'
import { BiomeSourcePreview, DecoratorPreview, NoisePreview, NoiseSettingsPreview } from '../previews'

export const HasPreview = ['dimension', 'worldgen/noise', 'worldgen/noise_settings', 'worldgen/configured_feature', 'worldgen/placed_feature']

type PreviewPanelProps = {
	model: DataModel | null,
	version: VersionId,
	id: string,
	shown: boolean,
	onError: (message: string) => unknown,
}
export function PreviewPanel({ model, version, id, shown }: PreviewPanelProps) {
	const [, setCount] = useState(0)

	useModel(model, () => {
		setCount(count => count + 1)
	})

	if (!model) return <></>

	if (id === 'dimension' && model.get(new Path(['generator', 'type']))?.endsWith('noise')) {
		const data = model.get(new Path(['generator', 'biome_source']))
		if (data) return <BiomeSourcePreview {...{ model, version, shown, data }} />
	}

	if (id === 'worldgen/noise') {
		const data = model.get(new Path([]))
		if (data) return <NoisePreview {...{ model, version, shown, data }} />
	}

	if (id === 'worldgen/noise_settings') {
		const data = model.get(new Path([]))
		if (data) return <NoiseSettingsPreview {...{ model, version, shown, data }} />
	}

	if ((id === 'worldgen/placed_feature' ||  (id === 'worldgen/configured_feature' && checkVersion(version, '1.16', '1.17')))) {
		const data = model.get(new Path([]))
		if (data) return <DecoratorPreview {...{ model, version, shown, data }} />
	}

	return <></>
}

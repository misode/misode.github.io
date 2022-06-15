import type { DataModel } from '@mcschema/core'
import { Path } from '@mcschema/core'
import { useState } from 'preact/hooks'
import { useModel } from '../../hooks/index.js'
import type { VersionId } from '../../services/index.js'
import { checkVersion } from '../../services/index.js'
import { BiomeSourcePreview, DecoratorPreview, DensityFunctionPreview, NoisePreview, NoiseSettingsPreview } from '../previews/index.js'

export const HasPreview = ['dimension', 'worldgen/density_function', 'worldgen/noise', 'worldgen/noise_settings', 'worldgen/configured_feature', 'worldgen/placed_feature']

type PreviewPanelProps = {
	model: DataModel | undefined,
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

	if (id === 'worldgen/density_function') {
		const data = model.get(new Path([]))
		if (data) return <DensityFunctionPreview {...{ model, version, shown, data }} />
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

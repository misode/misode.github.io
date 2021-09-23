import type { DataModel } from '@mcschema/core'
import { Path } from '@mcschema/core'
import { useState } from 'preact/hooks'
import { useModel } from '../hooks'
import type { VersionId } from '../Schemas'
import { BiomeSourcePreview, DecoratorPreview, NoiseSettingsPreview } from './previews'

export const HasPreview = ['dimension', 'worldgen/noise_settings', 'worldgen/configured_feature']

type PreviewPanelProps = {
	lang: string,
	model: DataModel | null,
	version: VersionId,
	id: string,
	shown: boolean,
	onError: (message: string) => unknown,
}
export function PreviewPanel({ lang, model, version, id, shown }: PreviewPanelProps) {
	const [, setCount] = useState(0)

	useModel(model, () => {
		setCount(count => count + 1)
	})

	if (id === 'dimension' && model?.get(new Path(['generator', 'type']))?.endsWith('noise')) {
		const data = model.get(new Path(['generator', 'biome_source']))
		if (data) return <BiomeSourcePreview {...{ lang, model, version, shown, data }} />
	}

	if (id === 'worldgen/noise_settings' && model) {
		const data = model.get(new Path([]))
		if (data) return <NoiseSettingsPreview {...{ lang, model, version, shown, data }} />
	}

	if (id === 'worldgen/configured_feature' && model) {
		const data = model.get(new Path([]))
		if (data) return <DecoratorPreview {...{ lang, model, version, shown, data }} />
	}

	return <></>
}

import type { DataModel } from '@mcschema/core'
import { Path } from '@mcschema/core'
import type { FunctionalComponent } from 'preact'
import { useState } from 'preact/hooks'
import { useModel } from '../hooks'
import type { VersionId } from '../Schemas'
import { BiomeSourcePreview, DecoratorPreview, NoiseSettingsPreview } from './previews'

export const HasPreview = ['dimension', 'worldgen/noise_settings', 'worldgen/configured_feature']

export const Previews: {
	id: string,
	generator: string,
	path: Path,
	predicate: (model: DataModel) => boolean,
	preview: FunctionalComponent<{
		lang: string,
		model: DataModel,
		data: any,
		version: VersionId,
		shown: boolean,
	}>,
}[] = [
	{
		id: 'biome-noise',
		generator: 'dimension',
		path: new Path(['generator', 'biome_source']),
		predicate: model => model.get(new Path(['generator', 'type'])).endsWith('noise'),
		preview: BiomeSourcePreview,
	},
	{
		id: 'noise-settings',
		generator: 'worldgen/noise_settings',
		path: new Path(['noise']),
		predicate: () => true,
		preview: NoiseSettingsPreview,
	},
	{
		id: 'decorator',
		generator: 'worldgen/configured_feature',
		path: new Path([]),
		predicate: () => true,
		preview: DecoratorPreview,
	},
]

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

	return <>
		{Previews.filter(p => p.generator === id).map(p => {
			const data = model?.get(p.path)
			if (!model || data === undefined || !p.predicate(model)) {
				return <></>
			}
			return p.preview({ lang, model: model!, data, version, shown })
		})}
	</>
}

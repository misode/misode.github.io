import type { DataModel } from '@mcschema/core'
import { Path } from '@mcschema/core'
import { useState } from 'preact/hooks'
import { useModel } from '../../hooks/index.js'
import type { VersionId } from '../../services/index.js'
import { checkVersion } from '../../services/index.js'
import { BiomeSourcePreview, BlockStatePreview, DecoratorPreview, DensityFunctionPreview, LootTablePreview, ModelPreview, NoisePreview, NoiseSettingsPreview, RecipePreview, StructureSetPreview } from '../previews/index.js'

export const HasPreview = ['loot_table', 'recipe', 'dimension', 'worldgen/density_function', 'worldgen/noise', 'worldgen/noise_settings', 'worldgen/configured_feature', 'worldgen/placed_feature', 'worldgen/structure_set', 'block_definition', 'model']

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
	const data = model.get(new Path([]))
	if (!data) return <></>

	if (id === 'loot_table') {
		return <LootTablePreview {...{ model, version, shown, data }} />
	}

	if (id === 'recipe') {
		return <RecipePreview {...{ model, version, shown, data }} />
	}

	if (id === 'dimension' && model.get(new Path(['generator', 'type']))?.endsWith('noise')) {
		return <BiomeSourcePreview {...{ model, version, shown, data }} />
	}

	if (id === 'worldgen/density_function') {
		return <DensityFunctionPreview {...{ model, version, shown, data }} />
	}

	if (id === 'worldgen/noise') {
		return <NoisePreview {...{ model, version, shown, data }} />
	}

	if (id === 'worldgen/noise_settings' && checkVersion(version, '1.18')) {
		return <NoiseSettingsPreview {...{ model, version, shown, data }} />
	}

	if ((id === 'worldgen/placed_feature' ||  (id === 'worldgen/configured_feature' && checkVersion(version, '1.16', '1.17')))) {
		return <DecoratorPreview {...{ model, version, shown, data }} />
	}

	if (id === 'worldgen/structure_set' && checkVersion(version, '1.19')) {
		return <StructureSetPreview {...{ model, version, shown, data }} />
	}

	if (id === 'block_definition') {
		return <BlockStatePreview {...{ model, version, shown, data }} />
	}

	if (id === 'model') {
		return <ModelPreview {...{ model, version, shown, data }} />
	}

	return <></>
}

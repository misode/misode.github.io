import { useVersion } from '../../contexts/Version.jsx'
import type { FileModel } from '../../services/index.js'
import { checkVersion } from '../../services/index.js'
import { BiomeSourcePreview, BlockStatePreview, DecoratorPreview, DensityFunctionPreview, LootTablePreview, ModelPreview, NoisePreview, NoiseSettingsPreview, RecipePreview, StructureSetPreview } from '../previews/index.js'

export const HasPreview = ['loot_table', 'recipe', 'dimension', 'worldgen/density_function', 'worldgen/noise', 'worldgen/noise_settings', 'worldgen/configured_feature', 'worldgen/placed_feature', 'worldgen/structure_set', 'block_definition', 'model']

type PreviewPanelProps = {
	model: FileModel | undefined,
	id: string,
	shown: boolean,
	onError: (message: string) => unknown,
}
export function PreviewPanel({ model, id, shown }: PreviewPanelProps) {
	const { version } = useVersion()

	if (!model) return <></>

	if (id === 'loot_table') {
		return <LootTablePreview {...{ model, shown }} />
	}

	if (id === 'recipe') {
		return <RecipePreview {...{ model, shown }} />
	}

	if (id === 'dimension' && model.data.generator?.type?.endsWith('noise')) {
		return <BiomeSourcePreview {...{ model, shown }} />
	}

	if (id === 'worldgen/density_function') {
		return <DensityFunctionPreview {...{ model, shown }} />
	}

	if (id === 'worldgen/noise') {
		return <NoisePreview {...{ model, shown }} />
	}

	if (id === 'worldgen/noise_settings' && checkVersion(version, '1.18')) {
		return <NoiseSettingsPreview {...{ model, shown }} />
	}

	if ((id === 'worldgen/placed_feature' ||  (id === 'worldgen/configured_feature' && checkVersion(version, '1.16', '1.17')))) {
		return <DecoratorPreview {...{ model, shown }} />
	}

	if (id === 'worldgen/structure_set' && checkVersion(version, '1.19')) {
		return <StructureSetPreview {...{ model, shown }} />
	}

	if (id === 'block_definition') {
		return <BlockStatePreview {...{ model, shown }} />
	}

	if (id === 'model') {
		return <ModelPreview {...{ model, shown }} />
	}

	return <></>
}

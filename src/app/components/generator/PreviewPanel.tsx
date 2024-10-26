import type { DocAndNode } from '@spyglassmc/core'
import { useDocAndNode } from '../../contexts/Spyglass.jsx'
import { useVersion } from '../../contexts/Version.jsx'
import { checkVersion } from '../../services/index.js'
import { safeJsonParse } from '../../Utils.js'
import { BiomeSourcePreview, BlockStatePreview, DecoratorPreview, DensityFunctionPreview, LootTablePreview, ModelPreview, NoisePreview, NoiseSettingsPreview, RecipePreview, StructureSetPreview } from '../previews/index.js'

export const HasPreview = ['loot_table', 'recipe', 'dimension', 'worldgen/density_function', 'worldgen/noise', 'worldgen/noise_settings', 'worldgen/configured_feature', 'worldgen/placed_feature', 'worldgen/structure_set', 'block_definition', 'docAndNode']

type PreviewPanelProps = {
	docAndNode: DocAndNode | undefined,
	id: string,
	shown: boolean,
	onError: (message: string) => unknown,
}
export function PreviewPanel({ docAndNode: original, id, shown }: PreviewPanelProps) {
	const { version } = useVersion()

	if (!original) return <></>

	const docAndNode = useDocAndNode(original)

	if (id === 'loot_table') {
		return <LootTablePreview {...{ docAndNode, shown }} />
	}

	if (id === 'recipe') {
		return <RecipePreview {...{ docAndNode, shown }} />
	}

	if (id === 'dimension' && safeJsonParse(docAndNode.doc.getText())?.generator?.type?.endsWith('noise')) {
		return <BiomeSourcePreview {...{ docAndNode, shown }} />
	}

	if (id === 'worldgen/density_function') {
		return <DensityFunctionPreview {...{ docAndNode, shown }} />
	}

	if (id === 'worldgen/noise') {
		return <NoisePreview {...{ docAndNode, shown }} />
	}

	if (id === 'worldgen/noise_settings' && checkVersion(version, '1.18')) {
		return <NoiseSettingsPreview {...{ docAndNode, shown }} />
	}

	if ((id === 'worldgen/placed_feature' ||  (id === 'worldgen/configured_feature' && checkVersion(version, '1.16', '1.17')))) {
		return <DecoratorPreview {...{ docAndNode, shown }} />
	}

	if (id === 'worldgen/structure_set' && checkVersion(version, '1.19')) {
		return <StructureSetPreview {...{ docAndNode, shown }} />
	}

	if (id === 'block_definition') {
		return <BlockStatePreview {...{ docAndNode, shown }} />
	}

	if (id === 'model') {
		return <ModelPreview {...{ docAndNode, shown }} />
	}

	return <></>
}

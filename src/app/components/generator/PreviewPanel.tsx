import type { DocAndNode } from '@spyglassmc/core'
import { useErrorBoundary } from 'preact/hooks'
import { useDocAndNode } from '../../contexts/Spyglass.jsx'
import { useVersion } from '../../contexts/Version.jsx'
import { checkVersion } from '../../services/index.js'
import { safeJsonParse } from '../../Utils.js'
import { ErrorPanel } from '../ErrorPanel.jsx'
import { BiomeSourcePreview, BlockStatePreview, DecoratorPreview, DensityFunctionPreview, DialogPreview, ItemModelPreview, LootTablePreview, ModelPreview, NoisePreview, NoiseSettingsPreview, RecipePreview, StructureSetPreview } from '../previews/index.js'

export const HasPreview = ['loot_table', 'recipe', 'dialog', 'dimension', 'worldgen/density_function', 'worldgen/noise', 'worldgen/noise_settings', 'worldgen/configured_feature', 'worldgen/placed_feature', 'worldgen/structure_set', 'block_definition', 'item_definition', 'model']

type PreviewPanelProps = {
	id: string,
	docAndNode: DocAndNode | undefined,
	shown: boolean,
}
export function PreviewPanel({ id, docAndNode: original, shown }: PreviewPanelProps) {
	if (!original) return <></>

	const docAndNode = useDocAndNode(original)

	const [error, dismissError] = useErrorBoundary()

	if (error) {
		const previewError = new Error(`Preview error: ${error.message}`)
		if (error.stack) {
			previewError.stack = error.stack
		}
		return <ErrorPanel error={previewError} onDismiss={dismissError} />
	}

	return <div class="h-full">
		<PreviewContent key={id} id={id} docAndNode={docAndNode} shown={shown} />
	</div>
}

type PreviewContentProps = {
	docAndNode: DocAndNode,
	id: string,
	shown: boolean,
}
export function PreviewContent({ id, docAndNode, shown }: PreviewContentProps) {
	const { version } = useVersion()

	if (id === 'loot_table') {
		return <LootTablePreview {...{ docAndNode, shown }} />
	}

	if (id === 'recipe') {
		return <RecipePreview {...{ docAndNode, shown }} />
	}

	if (id === 'dialog') {
		return <DialogPreview {...{ docAndNode, shown }} />
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

	if (id === 'item_definition') {
		return <ItemModelPreview {...{ docAndNode, shown }} />
	}

	if (id === 'model') {
		return <ModelPreview {...{ docAndNode, shown }} />
	}

	return <></>
}

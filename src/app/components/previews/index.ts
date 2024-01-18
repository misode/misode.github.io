import type { DataModel } from '@mcschema/core'
import type { VersionId } from '../../services/index.js'

export * from './BiomeSourcePreview.js'
export * from './BlockStatePreview.jsx'
export * from './DecoratorPreview.js'
export * from './DensityFunctionPreview.js'
export * from './LootTablePreview.jsx'
export * from './ModelPreview.jsx'
export * from './NoisePreview.js'
export * from './NoiseSettingsPreview.js'
export * from './StructureSetPreview.jsx'

export type PreviewProps = {
	model: DataModel,
	data: any,
	shown: boolean,
	version: VersionId,
}

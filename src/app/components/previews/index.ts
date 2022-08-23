import type { DataModel } from '@mcschema/core'
import type { VersionId } from '../../services/index.js'

export * from './BiomeSourcePreview.js'
export * from './DecoratorPreview.js'
export * from './DensityFunctionPreview.js'
export * from './NoisePreview.js'
export * from './NoiseSettingsPreview.js'

export type PreviewProps = {
	model: DataModel,
	data: any,
	shown: boolean,
	version: VersionId,
}

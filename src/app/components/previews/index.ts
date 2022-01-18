import type { DataModel } from '@mcschema/core'
import type { VersionId } from '../../services'

export * from './BiomeSourcePreview'
export * from './DecoratorPreview'
export * from './NoisePreview'
export * from './NoiseSettingsPreview'

export type PreviewProps = {
	model: DataModel,
	data: any,
	shown: boolean,
	version: VersionId,
}

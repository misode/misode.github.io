import type { DataModel } from '@mcschema/core'
import type { VersionId } from '../../Schemas'

export * from './BiomeSourcePreview'
export * from './DecoratorPreview'
export * from './NoisePreview'
export * from './NoiseSettingsPreview'

export type PreviewProps = {
	lang: string,
	model: DataModel,
	data: any,
	shown: boolean,
	version: VersionId,
}

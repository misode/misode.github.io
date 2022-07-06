import type { CollectionRegistry, SchemaRegistry } from '@mcschema/core'
import { initDawnApi } from './DawnAPI.js'
import { initImmersiveWeathering } from './ImmersiveWeathering.js'

export * from './ImmersiveWeathering.js'

export function initPartners(schemas: SchemaRegistry, collections: CollectionRegistry) {
	initDawnApi(schemas, collections)
	initImmersiveWeathering(schemas, collections)
}

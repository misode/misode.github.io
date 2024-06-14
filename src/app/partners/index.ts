import type { CollectionRegistry, SchemaRegistry } from '@mcschema/core'
import type { VersionId } from '../services/Schemas.js'
import { initImmersiveWeathering } from './ImmersiveWeathering.js'
import { initLithostitched } from './Lithostitched.js'
import { initObsidian } from './Obsidian.js'
import { initOhTheTreesYoullGrow } from './OhTheTreesYoullGrow.js'

export * from './ImmersiveWeathering.js'
export * from './Lithostitched.js'

export function initPartners(schemas: SchemaRegistry, collections: CollectionRegistry, version: VersionId) {
	initImmersiveWeathering(schemas, collections)
	initLithostitched(schemas, collections, version)
	initObsidian(schemas, collections)
	initOhTheTreesYoullGrow(schemas, collections)
}

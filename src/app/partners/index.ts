import type { CollectionRegistry, SchemaRegistry } from '@mcschema/core'
import { VersionId } from '../services/Schemas.js'
import { initImmersiveWeathering } from './ImmersiveWeathering.js'
import { initLithostitched } from './Lithostitched.js'
import { initObsidian } from './Obsidian.js'
import { initOhTheTreesYoullGrow } from './OhTheTreesYoullGrow.js'

export * from './ImmersiveWeathering.js'
export * from './Lithostitched.js'

export function initPartners(schemas: SchemaRegistry, collections: CollectionRegistry, id: VersionId) {
	initImmersiveWeathering(schemas, collections)
	initLithostitched(schemas, collections, id)
	initObsidian(schemas, collections)
	initOhTheTreesYoullGrow(schemas, collections)
}

import type { CollectionRegistry, SchemaRegistry } from '@mcschema/core'
import { initImmersiveWeathering } from './ImmersiveWeathering.js'
import { initLithostitched } from './Lithostitched.js'
import { initObsidian } from './Obsidian.js'
import { initOhTheTreesYoullGrow } from './OhTheTreesYoullGrow.js'

export * from './ImmersiveWeathering.js'
export * from './Lithostitched.js'

export function initPartners(schemas: SchemaRegistry, collections: CollectionRegistry) {
	initImmersiveWeathering(schemas, collections)
	initLithostitched(schemas, collections)
	initObsidian(schemas, collections)
	initOhTheTreesYoullGrow(schemas, collections)
}

import type { CollectionRegistry, SchemaRegistry } from '@mcschema/core'
import { initCommonSchemas } from '../common/common.js'
import type { VersionId } from '../services/Schemas.js'
import { initImmersiveWeathering } from './ImmersiveWeathering.js'
import { initLithostitched } from './Lithostitched.js'
import { initNeoForge } from './NeoForge.js'
import { initObsidian } from './Obsidian.js'
import { initOhTheTreesYoullGrow } from './OhTheTreesYoullGrow.js'
import { initShardborne } from './shardborne/index.js'

export * from './ImmersiveWeathering.js'
export * from './Lithostitched.js'

export function initPartners(schemas: SchemaRegistry, collections: CollectionRegistry, version: VersionId) {
	initCommonSchemas(schemas, collections)
	initImmersiveWeathering(schemas, collections)
	initLithostitched(schemas, collections, version)
	initNeoForge(schemas, collections, version)
	initObsidian(schemas, collections)
	initOhTheTreesYoullGrow(schemas, collections)
	initShardborne(schemas, collections)
}

import type { CollectionRegistry, SchemaRegistry } from '@mcschema/core'
import { initImmersiveWeathering } from './ImmersiveWeathering.js'
import { initFactionCraft } from './FactionCraft/FactionCraftInit.js'

export * from './ImmersiveWeathering.js'
export * from './FactionCraft/FactionCraftInit.js'

export function initPartners(schemas: SchemaRegistry, collections: CollectionRegistry) {
	initImmersiveWeathering(schemas, collections)
	initFactionCraft(schemas, collections)
}
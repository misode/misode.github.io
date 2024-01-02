import type { CollectionRegistry, SchemaRegistry } from '@mcschema/core'
import { initFaction } from './Faction.js'

export * from './Faction.js'

export function initFactionCraft(schemas: SchemaRegistry, collections: CollectionRegistry) {
	initFaction(schemas, collections)
}

import { initFaction } from './Faction.js'

const ID = 'faction_craft'

export * from './Faction.js'

export function initFactionCraft(schemas: SchemaRegistry, collections: CollectionRegistry) {
	initFaction(schemas, collections)
}

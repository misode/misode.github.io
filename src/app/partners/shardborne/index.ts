import type { CollectionRegistry, SchemaRegistry } from '@mcschema/core'
import { initCollections } from './collections.js'
import { initLootTableSchemas } from './loot_table.js'
import { initMobSpawning } from './mob_spawning.js'
import { initNPCs } from './npcs.js'
import { initProcessors } from './processors.js'
import { initTemplatePool } from './template_pool.js'
import { initTheme } from './theme.js'

export const ID = 'shardborne'

export function initShardborne(schemas: SchemaRegistry, collections: CollectionRegistry) {
	initCollections(schemas, collections)
	initTheme(schemas, collections)
	initTemplatePool(schemas, collections)
	initLootTableSchemas(schemas, collections)
	initProcessors(schemas, collections)
	initNPCs(schemas, collections)
	initMobSpawning(schemas, collections)
}

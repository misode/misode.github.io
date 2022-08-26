import type { CollectionRegistry, SchemaRegistry } from '@mcschema/core'
import { initImmersiveWeathering } from './ImmersiveWeathering.js'
import { initFactionCraft } from './FactionCraft/FactionCraftInit.js'

export * from './ImmersiveWeathering.js'
export * from './FactionCraft/FactionCraftInit.js'

export function initPartners(schemas: SchemaRegistry, collections: CollectionRegistry) {
	initImmersiveWeathering(schemas, collections)
	initFactionCraft(schemas, collections)
}

export async function loadPartnersLocale(language: string){
    let factioncraft = { default: {} }
    factioncraft = await import(`./FactionCraft/locales/${language}.json`)
    let other = { default: {} }
    other = await import(`./locales/${language}.json`)
    return { default: {...other.default, ...factioncraft.default}}
}
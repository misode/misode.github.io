import type { CollectionRegistry } from '@mcschema/core'
import config from '../../config.json'
import { message } from '../Utils'
import type { VersionAssets, VersionManifest } from './Manifest'
import type { BlockStateRegistry, VersionId } from './Schemas'
import { checkVersion } from './Schemas'

['1.15', '1.16', '1.17'].forEach(v => localStorage.removeItem(`cache_${v}`))

const CACHE_NAME = 'misode-v1'

type VersionRef = 'mcdata_master' | 'mcassets' | 'vanilla_datapack_summary' | 'vanilla_datapack_data'

type Version = {
	id: string,
	refs: Partial<{ [key in VersionRef]: string }>,
	dynamic?: boolean,
}

declare var __MCDATA_MASTER_HASH__: string
declare var __VANILLA_DATAPACK_SUMMARY_HASH__: string

const mcdataUrl = 'https://raw.githubusercontent.com/Arcensoth/mcdata'
const mcassetsUrl = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets'
const vanillaDatapackUrl = 'https://raw.githubusercontent.com/SPGoding/vanilla-datapack'
const manifestUrl = 'https://launchermeta.mojang.com/mc/game/version_manifest.json'
const resourceUrl = 'https://resources.download.minecraft.net/'
const corsUrl = 'https://misode-cors-anywhere.herokuapp.com/'

const refs: {
	id: VersionRef,
	hash: string,
	url: string,
}[] = [
	{
		id: 'mcdata_master',
		hash: __MCDATA_MASTER_HASH__,
		url: mcdataUrl,
	},
	{
		id: 'vanilla_datapack_summary',
		hash: __VANILLA_DATAPACK_SUMMARY_HASH__,
		url: vanillaDatapackUrl,
	},
]

export async function fetchData(versionId: string, collectionTarget: CollectionRegistry, blockStateTarget: BlockStateRegistry) {
	const version = config.versions.find(v => v.id === versionId) as Version | undefined
	if (!version) {
		console.error(`[fetchData] Unknown version ${version} in ${JSON.stringify(config.versions)}`)
		return
	}
	console.debug(`[fetchData] ${JSON.stringify(version)}`)

	if (version.dynamic) {
		await Promise.all(refs
			.filter(r => localStorage.getItem(`cached_${r.id}`) !== r.hash)
			.map(async r => {
				console.debug(`[deleteMatching] ${r.id} '${localStorage.getItem(`cached_${r.id}`)}' < '${r.hash}' ${r.url}/${version.refs[r.id]}`)
				await deleteMatching(url => url.startsWith(`${r.url}/${version.refs[r.id]}`))
				console.debug(`[deleteMatching] Done! ${r.id} ${r.hash} '${localStorage.getItem(`cached_${r.id}`)}'`)
				localStorage.setItem(`cached_${r.id}`, r.hash)
				console.debug(`[deleteMatching] Set! ${r.id} ${r.hash} '${localStorage.getItem(`cached_${r.id}`)}'`)
			}))
	}

	await Promise.all([
		fetchRegistries(version, collectionTarget),
		fetchBlockStateMap(version, blockStateTarget),
		fetchDynamicRegistries(version, collectionTarget),
		fetchAssetsRegistries(version, collectionTarget),
	])
}

async function fetchRegistries(version: Version, target: CollectionRegistry) {
	console.debug(`[fetchRegistries] ${version.id}`)
	const registries = config.registries
		.filter(r => !r.dynamic && !r.asset)
		.filter(r => checkVersion(version.id, r.minVersion, r.maxVersion))

	if (checkVersion(version.id, undefined, '1.15')) {
		const url = `${mcdataUrl}/${version.refs.mcdata_master}/generated/reports/registries.json`
		try {
			const data = await getData(url, (data) => {
				const res: {[id: string]: string[]} = {}
				Object.keys(data).forEach(k => {
					res[k.slice(10)] = Object.keys(data[k].entries)
				})
				return res
			})
			registries.forEach(r => {
				target.register(r.id, data[r.id] ?? [])
			})
		} catch (e) {
			console.warn('Error occurred while fetching registries:', message(e))
		}
	} else {
		await Promise.all(registries.map(async r => {
			try {
				const url = r.path
					? `${mcdataUrl}/${version.refs.mcdata_master}/${r.path}/data.min.json`
					: `${mcdataUrl}/${version.refs.mcdata_master}/processed/reports/registries/${r.id}/data.min.json`
				target.register(r.id, await getData(url, v => v.values))
			} catch (e) {
				console.warn(`Error occurred while fetching registry ${r.id}:`, message(e))
			}
		}))
	}
}

async function fetchBlockStateMap(version: Version, target: BlockStateRegistry) {
	console.debug(`[fetchBlockStateMap] ${version.id}`)
	if (checkVersion(version.id, undefined, '1.16')) {
		const url = (checkVersion(version.id, undefined, '1.15'))
			? `${mcdataUrl}/${version.refs.mcdata_master}/generated/reports/blocks.json`
			: `${mcdataUrl}/${version.refs.mcdata_master}/processed/reports/blocks/data.min.json`

		try {
			const data = await getData(url, (data) => {
				const res: BlockStateRegistry = {}
				Object.keys(data).forEach(b => {
					res[b] = {
						properties: data[b].properties,
						default: data[b].states.find((s: any) => s.default).properties,
					}
				})
				return res
			})
			Object.assign(target, data)
		} catch (e) {
			console.warn('Error occurred while fetching block state map:', message(e))
		}
	} else {
		const url = `${mcdataUrl}/${version.refs.mcdata_master}/processed/reports/blocks/simplified/data.min.json`
		try {
			const data = await getData(url)
			Object.assign(target, data)
		} catch (e) {
			console.warn('Error occurred while fetching block state map:', message(e))
		}
	}
}

async function fetchDynamicRegistries(version: Version, target: CollectionRegistry) {
	console.debug(`[fetchDynamicRegistries] ${version.id}`)
	const registries = config.registries
		.filter(r => r.dynamic && !r.asset)
		.filter(r => checkVersion(version.id, r.minVersion, r.maxVersion))

	if (checkVersion(version.id, '1.16')) {
		const url = `${vanillaDatapackUrl}/${version.refs.vanilla_datapack_summary}/summary/flattened.min.json`
		try {
			const data = await getData(url)
			registries.forEach(r => {
				target.register(r.id, data[r.id])
			})
		} catch (e) {
			console.warn('Error occurred while fetching dynamic registries:', message(e))
		}
	}
	if (checkVersion(version.id, '1.18')) {
		target.register('worldgen/noise', Noises)
		target.register('worldgen/placed_feature', PlacedFeatures)
	}
}

export async function fetchAssetsRegistries(version: Version, target: CollectionRegistry) {
	console.debug(`[fetchAssetsRegistries] ${version.id}`)
	const registries = config.registries
		.filter(r => r.asset)
		.filter(r => checkVersion(version.id, r.minVersion, r.maxVersion))

	await Promise.all(registries.map(async r => {
		try {
			const fetchFolder = async (path: string): Promise<string[]> => {
				const url = `${mcassetsUrl}/${version.refs.mcassets}/assets/minecraft/${path}/_list.json`
				const data = await getData(url)
				if (data.directories.length === 0) {
					return data.files
				}
				const directories = await Promise.all(data.directories.map(async (d: string) => {
					const files = await fetchFolder(`${path}/${d}`)
					return files.map(v => `${d}/${v}`)
				}))
				return [...data.files, ...directories.flat()]
			}
			const ids = (await fetchFolder(r.path ?? r.id))	
				.filter((v: string) => v.endsWith('.json') || v.endsWith('.png'))
				.map(v => `minecraft:${v.replace(/\.(json|png)$/, '')}`)
			target.register(r.id, ids)
		} catch (e) {
			console.warn(`Error occurred while fetching assets registry ${r.id}:`, message(e))
		}
	}))
}

export async function fetchPreset(version: VersionId, registry: string, id: string) {
	console.debug(`[fetchPreset] ${registry} ${id}`)
	const versionData = config.versions.find(v => v.id === version)!
	try {
		const url = ['blockstates', 'models'].includes(registry)
			?	`${mcassetsUrl}/${versionData.refs.mcassets}/assets/minecraft/${registry}/${id}.json`
			: `${vanillaDatapackUrl}/${versionData.refs.vanilla_datapack_data}/data/minecraft/${registry}/${id}.json`
		const res = await fetch(url)
		if (registry === 'worldgen/noise_settings' && version === '1.18') {
			let text = await res.text()
			text = text.replaceAll('"max_threshold": Infinity', '"max_threshold": 100')
			const data = JSON.parse(text)
			if (id !== 'overworld' && id !== 'large_biomes') {
				data.noise.terrain_shaper = { offset: 0, factor: 0, jaggedness: 0 }
			}
			return data
		}
		return await res.json()
	} catch (e) {
		console.warn(`Error occurred while fetching ${registry} preset ${id}:`, message(e))
	}
}

export async function fetchManifest() {
	try {
		const res = await fetch(manifestUrl)
		return await res.json()
	} catch (e) {
		throw new Error(`Error occurred while fetching version manifest: ${message(e)}`)
	}
}

export async function fetchAssets(versionId: VersionId, manifest: VersionManifest) {
	const version = config.versions.find(v => v.id === versionId)
	const id = version?.latest ?? manifest.latest.snapshot
	try {
		const versionMeta = await getData(manifest.versions.find(v => v.id === id)!.url)
	
		return (await getData(versionMeta.assetIndex.url)).objects
	} catch (e) {
		throw new Error(`Error occurred while fetching assets for ${version}: ${message(e)}`)
	}
}

export async function fetchSounds(version: VersionId, assets: VersionAssets) {
	try {
		const hash = assets['minecraft/sounds.json'].hash
		return await getData(getResourceUrl(hash))
	} catch (e) {
		throw new Error(`Error occurred while fetching sounds for ${version}: ${message(e)}`)
	}
}

export function getResourceUrl(hash: string) {
	return `${corsUrl}${resourceUrl}${hash.slice(0, 2)}/${hash}`
}

async function getData<T = any>(url: string, fn: (v: any) => T = (v: any) => v): Promise<T> {
	try {
		const cache = await caches.open(CACHE_NAME)
		console.debug(`[getData] Opened cache ${CACHE_NAME} ${url}`)
		const cacheResponse = await cache.match(url)
    
		if (cacheResponse && cacheResponse.ok) {
			console.debug(`[getData] Retrieving cached data ${url}`)
			return await cacheResponse.json()
		}
  
		console.debug(`[getData] fetching data ${url}`)
		const fetchResponse = await fetch(url)
		const responseData = fn(await fetchResponse.json())
		await cache.put(url, new Response(JSON.stringify(responseData)))
		return responseData
	} catch (e) {
		console.warn(`[getData] Failed to open cache ${CACHE_NAME}: ${message(e)}`)

		console.debug(`[getData] fetching data ${url}`)
		const fetchResponse = await fetch(url)
		const responseData = fn(await fetchResponse.json())
		return responseData
	}
}

async function deleteMatching(matches: (url: string) => boolean) {
	try {
		const cache = await caches.open(CACHE_NAME)
		console.debug(`[deleteMatching] Opened cache ${CACHE_NAME}`)
		const promises: Promise<boolean>[] = []
  
		for (const request of await cache.keys()) {
			if (matches(request.url)) {
				promises.push(cache.delete(request))
			}
		}
		console.debug(`[deleteMatching] Removing ${promises.length} cache objects...`)
		await Promise.all(promises)
	} catch (e) {
		console.warn(`[deleteMatching] Failed to open cache ${CACHE_NAME}: ${message(e)}`)
	}
}

const Noises = [
	'minecraft:aquifer_barrier',
	'minecraft:aquifer_fluid_level_floodedness',
	'minecraft:aquifer_fluid_level_spread',
	'minecraft:aquifer_lava',
	'minecraft:badlands_pillar',
	'minecraft:badlands_pillar_roof',
	'minecraft:badlands_surface',
	'minecraft:calcite',
	'minecraft:cave_cheese',
	'minecraft:cave_entrance',
	'minecraft:cave_layer',
	'minecraft:clay_bands_offset',
	'minecraft:continentalness',
	'minecraft:continentalness_large',
	'minecraft:erosion',
	'minecraft:erosion_large',
	'minecraft:gravel',
	'minecraft:gravel_layer',
	'minecraft:ice',
	'minecraft:iceberg_pillar',
	'minecraft:iceberg_pillar_roof',
	'minecraft:iceberg_surface',
	'minecraft:jagged',
	'minecraft:nether_state_selector',
	'minecraft:nether_wart',
	'minecraft:netherrack',
	'minecraft:noodle',
	'minecraft:noodle_ridge_a',
	'minecraft:noodle_ridge_b',
	'minecraft:noodle_thickness',
	'minecraft:offset',
	'minecraft:ore_gap',
	'minecraft:ore_vein_a',
	'minecraft:ore_vein_b',
	'minecraft:ore_veininess',
	'minecraft:packed_ice',
	'minecraft:patch',
	'minecraft:pillar',
	'minecraft:pillar_rareness',
	'minecraft:pillar_thickness',
	'minecraft:powder_snow',
	'minecraft:ridge',
	'minecraft:soul_sand_layer',
	'minecraft:spaghetti_2d',
	'minecraft:spaghetti_2d_elevation',
	'minecraft:spaghetti_2d_modulator',
	'minecraft:spaghetti_2d_thickness',
	'minecraft:spaghetti_3d_1',
	'minecraft:spaghetti_3d_2',
	'minecraft:spaghetti_3d_rarity',
	'minecraft:spaghetti_3d_thickness',
	'minecraft:spaghetti_roughness',
	'minecraft:spaghetti_roughness_modulator',
	'minecraft:surface',
	'minecraft:surface_secondary',
	'minecraft:surface_swamp',
	'minecraft:temperature',
	'minecraft:temperature_large',
	'minecraft:vegetation',
	'minecraft:vegetation_large',
]

const PlacedFeatures = [
	'minecraft:acacia_checked',
	'minecraft:amethyst_geode',
	'minecraft:bamboo',
	'minecraft:bamboo_light',
	'minecraft:bamboo_vegetation',
	'minecraft:basalt_blobs',
	'minecraft:basalt_pillar',
	'minecraft:birch_bees_0002',
	'minecraft:birch_bees_002',
	'minecraft:birch_checked',
	'minecraft:birch_tall',
	'minecraft:blackstone_blobs',
	'minecraft:blue_ice',
	'minecraft:brown_mushroom_nether',
	'minecraft:brown_mushroom_normal',
	'minecraft:brown_mushroom_old_growth',
	'minecraft:brown_mushroom_swamp',
	'minecraft:brown_mushroom_taiga',
	'minecraft:cave_vines',
	'minecraft:chorus_plant',
	'minecraft:classic_vines_cave_feature',
	'minecraft:crimson_forest_vegetation',
	'minecraft:crimson_fungi',
	'minecraft:dark_forest_vegetation',
	'minecraft:dark_oak_checked',
	'minecraft:delta',
	'minecraft:desert_well',
	'minecraft:disk_clay',
	'minecraft:disk_gravel',
	'minecraft:disk_sand',
	'minecraft:dripstone_cluster',
	'minecraft:end_gateway_return',
	'minecraft:end_island_decorated',
	'minecraft:end_spike',
	'minecraft:fancy_oak_bees',
	'minecraft:fancy_oak_bees_0002',
	'minecraft:fancy_oak_bees_002',
	'minecraft:fancy_oak_checked',
	'minecraft:flower_default',
	'minecraft:flower_flower_forest',
	'minecraft:flower_forest_flowers',
	'minecraft:flower_meadow',
	'minecraft:flower_plain',
	'minecraft:flower_swamp',
	'minecraft:flower_warm',
	'minecraft:forest_flowers',
	'minecraft:forest_rock',
	'minecraft:fossil_lower',
	'minecraft:fossil_upper',
	'minecraft:freeze_top_layer',
	'minecraft:glow_lichen',
	'minecraft:glowstone',
	'minecraft:glowstone_extra',
	'minecraft:grass_bonemeal',
	'minecraft:ice_patch',
	'minecraft:ice_spike',
	'minecraft:iceberg_blue',
	'minecraft:iceberg_packed',
	'minecraft:jungle_bush',
	'minecraft:jungle_tree',
	'minecraft:kelp_cold',
	'minecraft:kelp_warm',
	'minecraft:lake_lava_surface',
	'minecraft:lake_lava_underground',
	'minecraft:large_basalt_columns',
	'minecraft:large_dripstone',
	'minecraft:lush_caves_ceiling_vegetation',
	'minecraft:lush_caves_clay',
	'minecraft:lush_caves_vegetation',
	'minecraft:mega_jungle_tree_checked',
	'minecraft:mega_pine_checked',
	'minecraft:mega_spruce_checked',
	'minecraft:monster_room',
	'minecraft:monster_room_deep',
	'minecraft:mushroom_island_vegetation',
	'minecraft:nether_sprouts',
	'minecraft:oak_bees_0002',
	'minecraft:oak_bees_002',
	'minecraft:oak_checked',
	'minecraft:ore_ancient_debris_large',
	'minecraft:ore_andesite_lower',
	'minecraft:ore_andesite_upper',
	'minecraft:ore_blackstone',
	'minecraft:ore_clay',
	'minecraft:ore_coal_lower',
	'minecraft:ore_coal_upper',
	'minecraft:ore_copper',
	'minecraft:ore_copper_large',
	'minecraft:ore_debris_small',
	'minecraft:ore_diamond',
	'minecraft:ore_diamond_buried',
	'minecraft:ore_diamond_large',
	'minecraft:ore_diorite_lower',
	'minecraft:ore_diorite_upper',
	'minecraft:ore_dirt',
	'minecraft:ore_emerald',
	'minecraft:ore_gold',
	'minecraft:ore_gold_deltas',
	'minecraft:ore_gold_extra',
	'minecraft:ore_gold_lower',
	'minecraft:ore_gold_nether',
	'minecraft:ore_granite_lower',
	'minecraft:ore_granite_upper',
	'minecraft:ore_gravel',
	'minecraft:ore_gravel_nether',
	'minecraft:ore_infested',
	'minecraft:ore_iron_middle',
	'minecraft:ore_iron_small',
	'minecraft:ore_iron_upper',
	'minecraft:ore_lapis',
	'minecraft:ore_lapis_buried',
	'minecraft:ore_magma',
	'minecraft:ore_quartz_deltas',
	'minecraft:ore_quartz_nether',
	'minecraft:ore_redstone',
	'minecraft:ore_redstone_lower',
	'minecraft:ore_soul_sand',
	'minecraft:ore_tuff',
	'minecraft:patch_berry_common',
	'minecraft:patch_berry_rare',
	'minecraft:patch_cactus_decorated',
	'minecraft:patch_cactus_desert',
	'minecraft:patch_crimson_roots',
	'minecraft:patch_dead_bush',
	'minecraft:patch_dead_bush_2',
	'minecraft:patch_dead_bush_badlands',
	'minecraft:patch_fire',
	'minecraft:patch_grass_badlands',
	'minecraft:patch_grass_forest',
	'minecraft:patch_grass_jungle',
	'minecraft:patch_grass_normal',
	'minecraft:patch_grass_plain',
	'minecraft:patch_grass_savanna',
	'minecraft:patch_grass_taiga',
	'minecraft:patch_grass_taiga_2',
	'minecraft:patch_large_fern',
	'minecraft:patch_melon',
	'minecraft:patch_pumpkin',
	'minecraft:patch_soul_fire',
	'minecraft:patch_sugar_cane',
	'minecraft:patch_sugar_cane_badlands',
	'minecraft:patch_sugar_cane_desert',
	'minecraft:patch_sugar_cane_swamp',
	'minecraft:patch_sunflower',
	'minecraft:patch_tall_grass',
	'minecraft:patch_tall_grass_2',
	'minecraft:patch_waterlily',
	'minecraft:pine_checked',
	'minecraft:pine_on_snow',
	'minecraft:pointed_dripstone',
	'minecraft:red_mushroom_nether',
	'minecraft:red_mushroom_normal',
	'minecraft:red_mushroom_old_growth',
	'minecraft:red_mushroom_swamp',
	'minecraft:red_mushroom_taiga',
	'minecraft:rooted_azalea_tree',
	'minecraft:sea_pickle',
	'minecraft:seagrass_cold',
	'minecraft:seagrass_deep',
	'minecraft:seagrass_deep_cold',
	'minecraft:seagrass_deep_warm',
	'minecraft:seagrass_normal',
	'minecraft:seagrass_river',
	'minecraft:seagrass_simple',
	'minecraft:seagrass_swamp',
	'minecraft:seagrass_warm',
	'minecraft:small_basalt_columns',
	'minecraft:spore_blossom',
	'minecraft:spring_closed',
	'minecraft:spring_closed_double',
	'minecraft:spring_delta',
	'minecraft:spring_lava',
	'minecraft:spring_lava_frozen',
	'minecraft:spring_open',
	'minecraft:spring_water',
	'minecraft:spruce_checked',
	'minecraft:spruce_on_snow',
	'minecraft:super_birch_bees',
	'minecraft:super_birch_bees_0002',
	'minecraft:trees_badlands',
	'minecraft:trees_birch',
	'minecraft:trees_birch_and_oak',
	'minecraft:trees_flower_forest',
	'minecraft:trees_grove',
	'minecraft:trees_jungle',
	'minecraft:trees_meadow',
	'minecraft:trees_old_growth_pine_taiga',
	'minecraft:trees_old_growth_spruce_taiga',
	'minecraft:trees_plains',
	'minecraft:trees_savanna',
	'minecraft:trees_snowy',
	'minecraft:trees_sparse_jungle',
	'minecraft:trees_swamp',
	'minecraft:trees_taiga',
	'minecraft:trees_water',
	'minecraft:trees_windswept_forest',
	'minecraft:trees_windswept_hills',
	'minecraft:trees_windswept_savanna',
	'minecraft:twisting_vines',
	'minecraft:underwater_magma',
	'minecraft:vines',
	'minecraft:void_start_platform',
	'minecraft:warm_ocean_vegetation',
	'minecraft:warped_forest_vegetation',
	'minecraft:warped_fungi',
	'minecraft:weeping_vines',
]

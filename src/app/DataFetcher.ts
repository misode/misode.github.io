import type { CollectionRegistry } from '@mcschema/core'
import config from '../config.json'
import type { VersionAssets, VersionManifest } from './Manifest'
import type { BlockStateRegistry, VersionId } from './Schemas'
import { checkVersion } from './Schemas'
import { message } from './Utils'

['1.15', '1.16', '1.17'].forEach(v => localStorage.removeItem(`cache_${v}`))

const CACHE_NAME = 'misode-v1'

type VersionRef = 'mcdata_master' | 'vanilla_datapack_summary' | 'vanilla_datapack_data'

type Version = {
	id: string,
	refs: Partial<{ [key in VersionRef]: string }>,
	dynamic?: boolean,
}

declare var __MCDATA_MASTER_HASH__: string
declare var __VANILLA_DATAPACK_SUMMARY_HASH__: string

const mcdataUrl = 'https://raw.githubusercontent.com/Arcensoth/mcdata'
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
	])
}

async function fetchRegistries(version: Version, target: CollectionRegistry) {
	console.debug(`[fetchRegistries] ${version.id}`)
	const registries = config.registries
		.filter(r => !r.dynamic)
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
		.filter(r => r.dynamic)
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
}

export async function fetchPreset(version: VersionId, registry: string, id: string) {
	console.debug(`[fetchPreset] ${registry} ${id}`)
	const versionData = config.versions.find(v => v.id === version)!
	try {
		const url = `${vanillaDatapackUrl}/${versionData.refs.vanilla_datapack_data}/data/minecraft/${registry}/${id}.json`
		const res = await fetch(url)
		if (registry === 'worldgen/noise_settings' && version === '1.18') {
			let text = await res.text()
			text = text.replaceAll('"max_threshold": Infinity', '"max_threshold": 100')
			return JSON.parse(text)
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

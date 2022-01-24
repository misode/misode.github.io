import type { CollectionRegistry } from '@mcschema/core'
import config from '../../config.json'
import { message } from '../Utils'
import type { VersionAssets, VersionManifest } from './Manifest'
import type { BlockStateRegistry, VersionId } from './Schemas'

// Cleanup old caches
['1.15', '1.16', '1.17'].forEach(v => localStorage.removeItem(`cache_${v}`));
['mcdata_master', 'vanilla_datapack_summary'].forEach(v => localStorage.removeItem(`cached_${v}`))
caches.delete('misode-v1')

const CACHE_NAME = 'misode-v2'

type Version = {
	id: string,
	ref?: string,
	dynamic?: boolean,
}

declare var __MCMETA_SUMMARY_HASH__: string
const mcmetaHash = __MCMETA_SUMMARY_HASH__ ?? 'summary'

const mcmetaUrl = 'https://raw.githubusercontent.com/misode/mcmeta'
const manifestUrl = 'https://launchermeta.mojang.com/mc/game/version_manifest.json'
const resourceUrl = 'https://resources.download.minecraft.net/'
const corsUrl = 'https://misode-cors-anywhere.herokuapp.com/'

function mcmetaSummary(version: Version) {
	return `${mcmetaUrl}/${version.dynamic ? mcmetaHash : `${version.ref}-summary`}`
}

function mcmetaData(version: Version) {
	return `${mcmetaUrl}/${version.dynamic ? 'data' : `${version.ref}-data`}`
}

export async function fetchData(versionId: string, collectionTarget: CollectionRegistry, blockStateTarget: BlockStateRegistry) {
	const version = config.versions.find(v => v.id === versionId) as Version | undefined
	if (!version) {
		console.error(`[fetchData] Unknown version ${version} in ${JSON.stringify(config.versions)}`)
		return
	}

	if (version.dynamic) {
		if (localStorage.getItem('cached_mcmeta_summary') !== mcmetaHash) {
			await deleteMatching(url => url.startsWith(`${mcmetaUrl}/summary`))
			localStorage.setItem('cached_mcmeta_summary', mcmetaHash)
		}
		version.ref = mcmetaHash
	}

	await Promise.all([
		fetchRegistries(version, collectionTarget),
		fetchBlockStateMap(version, blockStateTarget),
	])
}

async function fetchRegistries(version: Version, target: CollectionRegistry) {
	console.debug(`[fetchRegistries] ${version.id}`)
	try {
		const data = await getData(`${mcmetaSummary(version)}/registries/data.min.json`)
		for (const id in data) {
			target.register(id, data[id].map((e: string) => 'minecraft:' + e))
		}
	} catch (e) {
		console.warn('Error occurred while fetching registries:', message(e))
	}
}

async function fetchBlockStateMap(version: Version, target: BlockStateRegistry) {
	console.debug(`[fetchBlockStateMap] ${version.id}`)
	try {
		const data = await getData(`${mcmetaSummary(version)}/blocks/data.min.json`)
		for (const id in data) {
			target['minecraft:' + id] = {
				properties: data[id][0],
				default: data[id][1],
			}
		}
	} catch (e) {
		console.warn('Error occurred while fetching block state map:', message(e))
	}
}

export async function fetchPreset(versionId: VersionId, registry: string, id: string) {
	console.debug(`[fetchPreset] ${versionId} ${registry} ${id}`)
	const version = config.versions.find(v => v.id === versionId)!
	try {
		const type = ['blockstates', 'models'].includes(registry) ? 'assets' : 'data'
		const url = `${mcmetaData(version)}/${type}/minecraft/${registry}/${id}.json`
		const res = await fetch(url)
		return res.json()
	} catch (e) {
		throw new Error(`Error occurred while fetching ${registry} preset ${id}: ${message(e)}`)
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
	const id = version?.ref ?? manifest.latest.snapshot
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

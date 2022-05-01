import type { CollectionRegistry } from '@mcschema/core'
import config from '../../config.json'
import { message } from '../Utils'
import type { BlockStateRegistry, VersionId } from './Schemas'

// Cleanup old caches
['1.15', '1.16', '1.17'].forEach(v => localStorage.removeItem(`cache_${v}`));
['mcdata_master', 'vanilla_datapack_summary'].forEach(v => localStorage.removeItem(`cached_${v}`))
caches.delete('misode-v1')

const CACHE_NAME = 'misode-v2'
const CACHE_LATEST_VERSION = 'cached_latest_version'

type Version = {
	id: string,
	ref?: string,
	dynamic?: boolean,
}

declare var __LATEST_VERSION__: string
const latestVersion = __LATEST_VERSION__ ?? ''
const mcmetaUrl = 'https://raw.githubusercontent.com/misode/mcmeta'

type McmetaTypes = 'summary' | 'data' | 'assets' | 'registries'

function mcmeta(version: { dynamic: true } | { dynamic?: false, ref?: string}, type: McmetaTypes) {
	return `${mcmetaUrl}/${version.dynamic ? type : `${version.ref}-${type}`}`
}

async function validateCache(version: Version) {
	if (version.dynamic) {
		if (localStorage.getItem(CACHE_LATEST_VERSION) !== latestVersion) {
			await deleteMatching(url => url.startsWith(`${mcmetaUrl}/summary/`) || url.startsWith(`${mcmetaUrl}/data/`) || url.startsWith(`${mcmetaUrl}/assets/`) || url.startsWith(`${mcmetaUrl}/registries/`))
			localStorage.setItem(CACHE_LATEST_VERSION, latestVersion)
		}
		version.ref = latestVersion
	}
}

export async function fetchData(versionId: string, collectionTarget: CollectionRegistry, blockStateTarget: BlockStateRegistry) {
	const version = config.versions.find(v => v.id === versionId) as Version | undefined
	if (!version) {
		console.error(`[fetchData] Unknown version ${version} in ${JSON.stringify(config.versions)}`)
		return
	}

	await validateCache(version)

	await Promise.all([
		fetchRegistries(version, collectionTarget),
		fetchBlockStateMap(version, blockStateTarget),
	])
}

async function fetchRegistries(version: Version, target: CollectionRegistry) {
	console.debug(`[fetchRegistries] ${version.id}`)
	try {
		const data = await getData(`${mcmeta(version, 'summary')}/registries/data.min.json`)
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
		const data = await getData(`${mcmeta(version, 'summary')}/blocks/data.min.json`)
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
		const url = `${mcmeta(version, type)}/${type}/minecraft/${registry}/${id}.json`
		const res = await fetch(url)
		return res.json()
	} catch (e) {
		throw new Error(`Error occurred while fetching ${registry} preset ${id}: ${message(e)}`)
	}
}

export async function fetchAllPresets(versionId: VersionId, registry: string) {
	console.debug(`[fetchAllPresets] ${versionId} ${registry}`)
	const version = config.versions.find(v => v.id === versionId)!
	await validateCache(version)
	try {
		const entries = await getData(`${mcmeta(version, 'registries')}/${registry}/data.min.json`)
		return new Map<string, unknown>(await Promise.all(
			entries.map(async (e: string) =>
				[e, await getData(`${mcmeta(version, 'data')}/data/minecraft/${registry}/${e}.json`)])
		))
	} catch (e) {
		throw new Error(`Error occurred while fetching all ${registry} presets: ${message(e)}`)
	}
}

export type SoundEvents = {
	[key: string]: {
		sounds: (string | { name: string })[],
	},
}
export async function fetchSounds(versionId: VersionId): Promise<SoundEvents> {
	const version = config.versions.find(v => v.id === versionId)!
	await validateCache(version)
	try {
		const url = `${mcmeta(version, 'summary')}/sounds/data.min.json`
		return await getData(url)
	} catch (e) {
		throw new Error(`Error occurred while fetching sounds for ${version}: ${message(e)}`)
	}
}

export function getSoundUrl(versionId: VersionId, path: string) {
	const version = config.versions.find(v => v.id === versionId)!
	return `${mcmeta(version, 'assets')}/assets/minecraft/sounds/${path}.ogg`
}

export type VersionMeta = {
	id: string,
	name: string,
	release_target: string,
	type: 'snapshot' | 'release',
	stable: boolean,
	data_version: number,
	protocol_version: number,
	data_pack_version: number,
	resource_pack_version: number,
	build_time: string,
	release_time: string,
	sha1: string,
}
export async function fetchVersions(): Promise<VersionMeta[]> {
	const version = config.versions[config.versions.length - 1]
	await validateCache(version)
	try {
		return getData(`${mcmeta(version, 'summary')}/versions/data.min.json`)
	} catch (e) {
		throw new Error(`Error occured while fetching versions: ${message(e)}`)
	}
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

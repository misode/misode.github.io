import { assetPath } from '../App.jsx'
import config from '../Config.js'
import { Store } from '../Store.js'
import { message } from '../Utils.js'
import type { VersionId } from './Versions.js'
import { checkVersion } from './Versions.js'

const CACHE_NAME = 'misode-v2'
const CACHE_LATEST_VERSION = 'cached_latest_version'
const CACHE_PATCH = 'misode_cache_patch'

declare var __LATEST_VERSION__: string
export const latestVersion = __LATEST_VERSION__ ?? ''
const mcmetaUrl = 'https://raw.githubusercontent.com/misode/mcmeta'
const mcmetaTarballUrl = 'https://github.com/misode/mcmeta/tarball'
const vanillaMcdocUrl = 'https://raw.githubusercontent.com/SpyglassMC/vanilla-mcdoc'
const changesUrl = 'https://raw.githubusercontent.com/misode/technical-changes'
const fixesUrl = 'https://raw.githubusercontent.com/misode/mcfixes'
const versionDiffUrl = 'https://mcmeta-diff.misode.workers.dev'
const whatsNewUrl = 'https://whats-new.misode.workers.dev'

type McmetaTypes = 'summary' | 'data' | 'data-json' | 'assets' | 'assets-json' | 'registries' | 'atlas'

interface RefInfo {
	dynamic?: boolean
	ref?: string
}

function mcmeta(version: RefInfo, type: McmetaTypes, tarball?: boolean) {
	return `${tarball ? mcmetaTarballUrl : mcmetaUrl}/${version.dynamic ? type : `${version.ref}-${type}`}`
}

async function validateCache(version: RefInfo) {
	await applyPatches()
	if (version.dynamic) {
		if (localStorage.getItem(CACHE_LATEST_VERSION) !== latestVersion) {
			await deleteMatching(url => url.startsWith(`${mcmetaUrl}/summary/`) || url.startsWith(`${mcmetaUrl}/data/`) || url.startsWith(`${mcmetaUrl}/assets/`) || url.startsWith(`${mcmetaUrl}/registries/`) || url.startsWith(`${mcmetaUrl}/atlas/`) || url.startsWith(`${mcmetaTarballUrl}/assets-json/`))
			localStorage.setItem(CACHE_LATEST_VERSION, latestVersion)
		}
		version.ref = latestVersion
	}
}

export function getVersionChecksum(versionId: VersionId) {
	const version = config.versions.find(v => v.id === versionId)!
	if (version.dynamic) {
		return (localStorage.getItem(CACHE_LATEST_VERSION) ?? '').toString()
	}
	return version.ref
}

export interface VanillaMcdocSymbols {
	ref: string,
	mcdoc: Record<string, unknown>,
	'mcdoc/dispatcher': Record<string, Record<string, unknown>>,
}
export async function fetchVanillaMcdoc(): Promise<VanillaMcdocSymbols> {
	try {
		return cachedFetch<VanillaMcdocSymbols>(`${vanillaMcdocUrl}/generated/symbols.json`, { refresh: true })
	} catch (e) {
		throw new Error(`Error occured while fetching vanilla-mcdoc: ${message(e)}`)
	}
}

export async function fetchDependencyMcdoc(dependency: string) {
	try {
		return cachedFetch(assetPath(`/mcdoc/${dependency}.mcdoc`), { decode: res => res.text(), refresh: true })
	} catch (e) {
		throw new Error(`Error occured while fetching ${dependency} mcdoc: ${message(e)}`)
	}
}

export async function fetchRegistries(versionId: VersionId) {
	console.debug(`[fetchRegistries] ${versionId}`)
	const version = config.versions.find(v => v.id === versionId)!
	await validateCache(version)
	try {
		const data = await cachedFetch<any>(`${mcmeta(version, 'summary')}/registries/data.min.json`)
		const result = new Map<string, string[]>()
		for (const id in data) {
			result.set(id, data[id].map((e: string) => 'minecraft:' + e))
		}
		return result
	} catch (e) {
		throw new Error(`Error occurred while fetching registries: ${message(e)}`)
	}
}

export type BlockStateData = [Record<string, string[]>, Record<string, string>]

export async function fetchBlockStates(versionId: VersionId) {
	console.debug(`[fetchBlockStates] ${versionId}`)
	const version = config.versions.find(v => v.id === versionId)!
	const result = new Map<string, BlockStateData>()
	await validateCache(version)
	try {
		const data = await cachedFetch<any>(`${mcmeta(version, 'summary')}/blocks/data.min.json`)
		for (const id in data) {
			result.set(id, data[id])
		}
	} catch (e) {
		console.warn('Error occurred while fetching block states:', message(e))
	}
	return result
}

export async function fetchItemComponents(versionId: VersionId) {
	console.debug(`[fetchItemComponents] ${versionId}`)
	const version = config.versions.find(v => v.id === versionId)!
	const result = new Map<string, Map<string, unknown>>()
	if (!checkVersion(versionId, '1.20.5')) {
		return result
	}
	await validateCache(version)
	try {
		const data = await cachedFetch<Record<string, Record<string, unknown>>>(`${mcmeta(version, 'summary')}/item_components/data.min.json`)
		for (const [id, components] of Object.entries(data)) {
			const base = new Map<string, unknown>()
			if (Array.isArray(components)) { // syntax before 1.21
				for (const entry of components) {
					base.set(entry.type, entry.value)
				}
			} else {
				for (const [key, value] of Object.entries(components)) {
					base.set(key, value)
				}
			}
			result.set('minecraft:' + id, base)
		}
	} catch (e) {
		console.warn('Error occurred while fetching item components:', message(e))
	}
	return result
}

export async function fetchPreset(versionId: VersionId, registry: string, id: string) {
	console.debug(`[fetchPreset] ${versionId} ${registry} ${id}`)
	const version = config.versions.find(v => v.id === versionId)!
	await validateCache(version)
	try {
		let url
		if (id.startsWith('immersive_weathering:')) {
			url = `https://raw.githubusercontent.com/AstralOrdana/Immersive-Weathering/main/src/main/resources/data/immersive_weathering/block_growths/${id.slice(21)}.json`
		} else {
			const type = ['atlases', 'blockstates', 'items', 'font', 'lang', 'models', 'equipment', 'post_effect'].includes(registry) ? 'assets' : 'data'
			url = `${mcmeta(version, type)}/${type}/minecraft/${registry}/${id}.json`
		}
		const res = await fetch(url)
		return await res.text()
	} catch (e) {
		throw new Error(`Error occurred while fetching ${registry} preset ${id}: ${message(e)}`)
	}
}

export async function fetchAllPresets(versionId: VersionId, registry: string) {
	console.debug(`[fetchAllPresets] ${versionId} ${registry}`)
	const version = config.versions.find(v => v.id === versionId)!
	await validateCache(version)
	try {
		const type = ['atlas', 'block_definition', 'item_definition', 'model', 'font', 'lang', 'equipment', 'post_effect'].includes(registry) ? 'assets' : 'data'
		return new Map<string, unknown>(Object.entries(await cachedFetch(`${mcmeta(version, 'summary')}/${type}/${registry}/data.min.json`)))
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
		return await cachedFetch(url)
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
	await validateCache({ dynamic: true })
	try {
		return cachedFetch(`${mcmeta({ dynamic: true }, 'summary')}/versions/data.min.json`, { refresh: true })
	} catch (e) {
		throw new Error(`Error occured while fetching versions: ${message(e)}`)
	}
}

export function getAssetUrl(versionId: VersionId, type: string, path: string): string {
	const version = config.versions.find(v => v.id === versionId)!
	return `${mcmeta(version, 'assets')}/assets/minecraft/${type}/${path}.png`
}

export async function fetchResources(versionId: VersionId) {
	const version = config.versions.find(v => v.id === versionId)!
	const needsItemModels = checkVersion(versionId, '1.20.5')
	const hasItemModels = checkVersion(versionId, '1.21.4')
	await validateCache(version)
	try {
		const [blockDefinitions, models, uvMapping, atlas, itemDefinitions] = await Promise.all([
			fetchAllPresets(versionId, 'block_definition'),
			fetchAllPresets(versionId, 'model'),
			fetch(`${mcmeta(version, 'atlas')}/all/data.min.json`).then(r => r.json()),
			loadImage(`${mcmeta(version, 'atlas')}/all/atlas.png`),
			// Always download the 1.21.4 item models for the version range 1.20.5 - 1.21.3
			needsItemModels ? fetchAllPresets(hasItemModels ? versionId : '1.21.4', 'item_definition') : new Map<string, unknown>(),
		])
		return { blockDefinitions, models, uvMapping, atlas, itemDefinitions }
	} catch (e) {
		throw new Error(`Error occured while fetching resources: ${message(e)}`)
	}
}

export async function loadImage(src: string) {
	return new Promise<HTMLImageElement>(res => {
		const image = new Image()
		image.onload = () => res(image)
		image.crossOrigin = 'Anonymous'
		image.src = src
	})
}

/*
async function loadImage(src: string) {
	const buffer = await cachedFetch(src, { decode: r => r.arrayBuffer() })
	const blob = new Blob([buffer], { type: 'image/png' })
	const img = new Image()
	img.src = URL.createObjectURL(blob)
	return new Promise<ImageData>((res) => {
		img.onload = () => {
			const canvas = document.createElement('canvas')
			const ctx = canvas.getContext('2d')!
			ctx.drawImage(img, 0, 0)
			const imgData = ctx.getImageData(0, 0, img.width, img.height)
			res(imgData)
		}
	})
}
*/

interface DeprecatedInfo {
	removed: string[]
	renamed: Record<string, string>
}

export async function fetchLanguage(versionId: VersionId, lang: string = 'en_us') {
	const version = config.versions.find(v => v.id === versionId)!
	await validateCache(version)
	try {
		const translations = await cachedFetch<Record<string, string>>(`${mcmeta(version, 'assets')}/assets/minecraft/lang/${lang}.json`)
		if (checkVersion(versionId, '1.21.2')) {
			const deprecated = await cachedFetch<DeprecatedInfo>(`${mcmeta(version, 'assets')}/assets/minecraft/lang/deprecated.json`)
			for (const key of deprecated.removed) {
				delete translations[key]
			}
			for (const [oldKey, newKey] of Object.entries(deprecated.renamed)) {
				const value = translations[oldKey]
				delete translations[oldKey]
				translations[newKey] = value
			}
		}
		return translations
	} catch (e) {
		throw new Error(`Error occured while fetching language: ${message(e)}`)
	}
}

export interface Change {
	group: string,
	version: string,
	order: number,
	tags: string[],
	content: string,
}

export async function fetchChangelogs(): Promise<Change[]> {
	try {
		const [changes, versions] = await Promise.all([
			cachedFetch<Omit<Change, 'order'>[]>(`${changesUrl}/generated/changes.json`, { refresh: true }),
			fetchVersions(),
		])
		const versionMap = new Map(versions.map((v, i) => [v.id, versions.length - i]))
		return changes.map(c => ({ ...c, order: versionMap.get(c.version) ?? 0 }))
	} catch (e) {
		throw new Error(`Error occured while fetching technical changes: ${message(e)}`)
	}
}

export interface Bugfix {
	id: string,
	summary: string,
	labels: string[],
	status: string,
	confirmation_status: string,
	categories: string[],
	priority: string,
	fix_versions: string[],
	creation_date: string,
	resolution_date: string,
	updated_date: string,
	watches: number,
	votes: number,
}

export async function fetchBugfixes(version: string): Promise<Bugfix[]> {
	try {
		const fixes = await cachedFetch<Bugfix[]>(`${fixesUrl}/main/versions/${version}.json`, { refresh: true })
		return fixes
	} catch (e) {
		throw new Error(`Error occured while fetching bugfixes for version ${version}: ${message(e)}`)
	}
}

export interface GitHubCommitFile {
	sha: string,
	filename: string,
	previous_filename?: string,
	status: 'added' | 'modified' | 'removed' | 'renamed',
	additions: number,
	deletions: number,
	changes: number,
	patch: string,
}

export interface GitHubCommit {
	sha: string,
	html_url: string,
	parents: {
		sha: string,
	}[],
	stats: {
		total: number,
		additions: number,
		deletions: number,
	},
	files: GitHubCommitFile[],
}

export async function fetchVersionDiff(version: string) {
	try {
		const diff = await cachedFetch<GitHubCommit>(`${versionDiffUrl}/${version}`, { refresh: true })
		return diff
	} catch (e) {
		throw new Error(`Error occured while fetching diff for version ${version}: ${message(e)}`)
	}
}

export interface WhatsNewItem {
	id: string,
	title: string,
	body: string,
	url: string,
	createdAt: string,
	seenAt?: string,
}

export async function fetchWhatsNew(): Promise<WhatsNewItem[]> {
	try {
		const whatsNew = await cachedFetch<WhatsNewItem[]>(whatsNewUrl, { refresh: true })
		const seenState = Store.getWhatsNewSeen()
		for (const { id, time } of seenState) {
			const item = whatsNew.find(i => i.id === id)
			if (item) {
				item.seenAt = time
			}
		}
		return whatsNew
	} catch (e) {
		throw new Error(`Error occured while fetching what's new: ${message(e)}`)
	}
}

interface FetchOptions<D> {
	decode?: (r: Response) => Promise<D>
	refresh?: boolean
}

const REFRESHED = new Set<string>()

async function cachedFetch<D = unknown>(url: string, { decode = (r => r.json()), refresh }: FetchOptions<D> = {}): Promise<D> {
	try {
		const cache = await caches.open(CACHE_NAME)
		console.debug(`[cachedFetch] Opened cache ${CACHE_NAME} ${url}`)
		const cacheResponse = await cache.match(url)

		if (refresh) {
			if (REFRESHED.has(url)) {
				refresh = false
			} else {
				REFRESHED.add(url)
			}
		}

		if (refresh) {
			try {
				return await fetchAndCache(cache, url, decode, refresh)
			} catch (e) {
				if (cacheResponse && cacheResponse.ok) {
					console.debug(`[cachedFetch] Cannot refresh, using cache ${url}`)
					return await decode(cacheResponse)
				}
				throw new Error(`Failed to fetch: ${message(e)}`)
			}
		} else {
			if (cacheResponse && cacheResponse.ok) {
				console.debug(`[cachedFetch] Retrieving cached data ${url}`)
				return await decode(cacheResponse)
			}
			return await fetchAndCache(cache, url, decode)
		}
	} catch (e: any) {
		console.warn(`[cachedFetch] Failed to open cache ${CACHE_NAME}: ${e.message}`)

		console.debug(`[cachedFetch] Fetching data ${url}`)
		const fetchResponse = await fetch(url)
		const fetchData = await decode(fetchResponse)
		return fetchData
	}
}

const RAWGITHUB_REGEX = /^https:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.*)$/

async function fetchAndCache<D>(cache: Cache, url: string, decode: (r: Response) => Promise<D>, noCache?: boolean) {
	console.debug(`[cachedFetch] Fetching data ${url}`)
	let fetchResponse
	try {
		fetchResponse = await fetch(url, noCache ? { cache: 'no-cache' } : undefined)
	} catch (e) {
		if (url.startsWith('https://raw.githubusercontent.com/')) {
			const backupUrl = url.replace(RAWGITHUB_REGEX, 'https://cdn.jsdelivr.net/gh/$1/$2@$3/$4')
			console.debug(`[cachedFetch] Retrying using ${backupUrl}`)
			try {
				fetchResponse = await fetch(backupUrl)
			} catch (e) {
				throw new Error(`Backup "${backupUrl}" failed: ${message(e)}`)
			}
		} else {
			throw e
		}
	}
	const fetchClone = fetchResponse.clone()
	const fetchData = await decode(fetchResponse)
	await cache.put(url, fetchClone)
	return fetchData
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

const PATCHES: (() => Promise<void>)[] = [
	async () => {
		['1.15', '1.16', '1.17'].forEach(v => localStorage.removeItem(`cache_${v}`));
		['mcdata_master', 'vanilla_datapack_summary'].forEach(v => localStorage.removeItem(`cached_${v}`))
		caches.delete('misode-v1')
	},
	async () => {
		await deleteMatching(url => url.startsWith(`${mcmetaUrl}/1.18.2-summary/`))
	},
]

async function applyPatches() {
	const start = parseInt(localStorage.getItem(CACHE_PATCH) ?? '0')
	for (let i = start + 1; i <= PATCHES.length; i +=1) {
		const patch = PATCHES[i - 1]
		if (patch) {
			await patch()
		}
		localStorage.setItem(CACHE_PATCH, i.toFixed())
	}
}

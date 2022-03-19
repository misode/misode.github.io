import lz from 'lz-string'
import config from '../../config.json'
import type { VersionId } from './Schemas'

const API_PREFIX = 'https://z15g7can.directus.app/items'
export const SHARE_KEY = 'share'

const ShareCache = new Map<string, string>()

export async function shareSnippet(type: string, version: VersionId, jsonData: any) {
	try {
		const data = lz.compressToBase64(JSON.stringify(jsonData))
		const raw = btoa(JSON.stringify(jsonData))
		console.log('Compression rate', raw.length / data.length)
		const body = JSON.stringify({ data, type, version })
		let id = ShareCache.get(body)
		if (!id) {
			const snippet = await fetchApi('/snippets', body)
			ShareCache.set(body, snippet.id)
			id = snippet.id as string
		}
		const gen = config.generators.find(g => g.id === type)!
		return `${location.protocol}//${location.host}/${gen.url}/?${SHARE_KEY}=${id}`
	} catch (e) {
		if (e instanceof Error) {
			e.message = `Error creating share link: ${e.message}`
		}
		throw e
	}
}

export async function getSnippet(id: string) {
	try {
		const snippet = await fetchApi(`/snippets/${id}`)
		return {
			...snippet,
			data: JSON.parse(lz.decompressFromBase64(snippet.data) ?? '{}'),
		}
	} catch (e) {
		if (e instanceof Error) {
			e.message = `Error loading shared content: ${e.message}`
		}
		throw e
	}
}

async function fetchApi(url: string, body?: string) {
	const res = await fetch(API_PREFIX + url, body ? {
		method: 'post',
		headers: { 'Content-Type': 'application/json' },
		body,
	} : undefined)
	const data = await res.json()
	if (data.data) {
		return data.data
	}
	throw new Error(data.errors?.[0]?.message ?? 'Unknown error')
}

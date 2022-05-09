import lz from 'lz-string'
import type { VersionId } from './Schemas'

const API_PREFIX = 'https://z15g7can.directus.app/items'

const ShareCache = new Map<string, string>()

export async function shareSnippet(type: string, version: VersionId, jsonData: any, show_preview: boolean) {
	try {
		const raw = JSON.stringify(jsonData)
		const data = lz.compressToBase64(raw)
		console.log('Compression rate', raw.length / raw.length)
		const body = JSON.stringify({ data, type, version, show_preview })
		let id = ShareCache.get(body)
		if (!id) {
			const snippet = await fetchApi('/snippets', body)
			ShareCache.set(body, snippet.id)
			id = snippet.id as string
		}
		return { id, length: raw.length, compressed: data.length, rate: raw.length / data.length }
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

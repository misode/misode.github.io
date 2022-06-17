import type { DataModel } from '@mcschema/core'
import { Path } from '@mcschema/core'
import * as zip from '@zip.js/zip.js'
import yaml from 'js-yaml'
import { route } from 'preact-router'
import rfdc from 'rfdc'
import config from './Config.js'

export function isPromise(obj: any): obj is Promise<any> {
	return typeof (obj as any)?.then === 'function' 
}

export function isObject(obj: any): obj is Record<string, any> {
	return typeof obj === 'object' && obj !== null
}

function decToHex(n: number) {
	return n.toString(16).padStart(2, '0')
}

export function hexId(length = 12) {
	var arr = new Uint8Array(length / 2)
	window.crypto.getRandomValues(arr)
	return Array.from(arr, decToHex).join('')
}

export function randomSeed() {
	return BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))
}

export function generateUUID() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		const r = Math.random()*16|0
		const v = c == 'x' ? r : (r&0x3|0x8)
		return v.toString(16)
	})
}

export function newSeed(model: DataModel) {
	const seed = Math.floor(Math.random() * (4294967296)) - 2147483648
	const dimensions = model.get(new Path(['dimensions']))
	model.set(new Path(['seed']), seed, true)
	if (isObject(dimensions)) {
		Object.keys(dimensions).forEach(id => {
			model.set(new Path(['dimensions', id, 'generator', 'seed']), seed, true)
			model.set(new Path(['dimensions', id, 'generator', 'biome_source', 'seed']), seed, true)
		})
	}
	model.set(new Path(['placement', 'salt']), Math.abs(seed), true)
	model.set(new Path(['generator', 'seed']), seed, true)
	model.set(new Path(['generator', 'biome_source', 'seed']), seed)
}

export function htmlEncode(str: string) {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;')
}

export function hashString(s: string) {
	let h = 0
	for(let i = 0; i < s.length; i++)
		h = Math.imul(31, h) + s.charCodeAt(i) | 0
	return h
}

export function cleanUrl(url: string) {
	return `/${url}/`.replaceAll('//', '/')
}

export function getPath(url: string) {
	const searchIndex = url.indexOf('?')
	if (searchIndex >= 0) {
		url = url.slice(0, searchIndex)
	}
	return cleanUrl(url)
}

export function getGenerator(url: string) {
	const trimmedUrl = getPath(url).replace(/^\//, '').replace(/\/$/, '')
	return config.generators.find(g => g.url === trimmedUrl)
}

export function changeUrl({ path, search, hash, replace }: { path?: string, search?: string, hash?: string, replace?: boolean }) {
	const url = (path !== undefined ? cleanUrl(path) : location.pathname)
		+ (search !== undefined ? (search.startsWith('?') || search.length === 0 ? search : '?' + search) : location.search)
		+ (hash !== undefined ? (hash.startsWith('#') ? hash : '#' + hash) : location.hash)
	route(url, replace)
}

export function parseFrontMatter(source: string): Record<string, any> {
	const data = yaml.load(source.substring(3, source.indexOf('---', 3)))
	if (!isObject(data)) return {}
	return data
}

export function versionContent(content: string, version: string) {
	let cursor = 0
	while (true) {
		const start = content.indexOf('{#', cursor)
		if (start < 0) {
			break
		}
		const end = findMatchingClose(content, start + 2)
		const vStart = content.indexOf('#[', start + 1)
		let sub = ''
		if (vStart >= 0 && vStart < end) {
			const vEnd = content.indexOf(']', vStart + 2)
			const v = content.substring(vStart + 2, vEnd)
			if (v === version) {
				sub = content.substring(vEnd + 1, end).trim()
			}
		} else {
			const key = content.substring(start + 2, end)
			const versionConfig = config.versions.find(v => v.id === version)
			sub = ({
				version: versionConfig?.id,
				pack_format: versionConfig?.pack_format.toString(),
			} as Record<string, string | undefined>)[key] ?? ''
		}
		content = content.substring(0, start) + sub + content.substring(end + 2)
		cursor = start
		
	}
	return content
}

function findMatchingClose(source: string, index: number) {
	let depth = 0
	let iteration = 0
	while (iteration++ < 1000) {
		const close = source.indexOf('#}', index)
		const open = source.indexOf('{#', index)
		if (close < 0) {
			console.warn('Missing closing bracket')
			return source.length
		}
		if (open < 0) {
			if (depth === 0) {
				return close
			} else {
				depth -= 1
				index = close + 2
			}
		} else if (open < close) {
			depth += 1
			index = open + 2
		} else if (depth === 0) {
			return close
		} else {
			depth -= 1
			index = close + 2
		}
	}
	console.warn('Exceeded max iterations while finding closing bracket')
	return source.length
}

export type Color = [number, number, number]

export function stringToColor(str: string): Color {
	const h = Math.abs(hashString(str))
	return [h % 256, (h >> 8) % 256, (h >> 16) % 256]
}

export function rgbToHex(color: Color): string {
	if (!Array.isArray(color) || color.length !== 3) return '#000000'
	const [r, g, b] = color
	return '#' + decToHex(r) + decToHex(g) + decToHex(b)
}

export function hexToRgb(hex: string | undefined): Color {
	if (typeof hex !== 'string') return [0, 0, 0]
	const num = parseInt(hex.startsWith('#') ? hex.slice(1) : hex, 16)
	const r = (num >> 16) & 255
	const g = (num >> 8) & 255
	const b = num & 255
	return [r, g, b]
}

export function square(a: number) {
	return a * a
}

export function clamp(a: number, b: number, c: number) {
	return Math.max(a, Math.min(b, c))
}

export function clampedLerp(a: number, b: number, c: number): number {
	if (c < 0) {
		return a
	} else if (c > 1) {
		return b
	} else {
		return lerp(c, a, b)
	}
}

export function lerp(a: number, b: number, c: number): number {
	return b + a * (c - b)
}

export function lerp2(a: number, b: number, c: number, d: number, e: number, f: number): number {
	return lerp(b, lerp(a, c, d), lerp(a, e, f))
}

export function lerp3(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) {
	return lerp(c, lerp2(a, b, d, e, f, g), lerp2(a, b, h, i, j, k))
}

export function smoothstep(x: number): number {
	return x * x * x * (x * (x * 6 - 15) + 10)
}

export function message(e: unknown): string {
	if (e instanceof Error) return e.message
	return `${e}`
}

export const deepClone = rfdc()

/**
 * MIT License
 * 
 * Copyright (c) 2017 Evgeny Poberezkin
 * 
 * https://github.com/epoberezkin/fast-deep-equal/blob/master/LICENSE
 */
export function deepEqual(a: any, b: any) {
	if (a === b) return true

	if (a && b && typeof a == 'object' && typeof b == 'object') {
		if (a.constructor !== b.constructor) return false
		let length, i
		if (Array.isArray(a)) {
			length = a.length
			if (length != b.length) return false
			for (i = 0; i < length; i++) {
				if (!deepEqual(a[i], b[i])) return false
			}
			return true
		}
		if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf()
		if (a.toString !== Object.prototype.toString) return a.toString() === b.toString()
		const keys = Object.keys(a)
		length = keys.length
		if (length !== Object.keys(b).length) return false
		for (i = length; i-- !== 0;)
			if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false
		for (i = length; i-- !== 0;) {
			const key = keys[i]
			if (!deepEqual(a[key], b[key])) return false
		}
		return true
	}
	return a !== a && b !== b
}

export class BiMap<A, B> {
	public readonly forward: Map<A, B>
	public readonly backward: Map<B, A>

	constructor() {
		this.forward = new Map()
		this.backward = new Map()
	}

	public set(a: A, b: B) {
		this.forward.set(a, b)
		this.backward.set(b, a)
	}

	public getA(key: B) {
		return this.backward.get(key)
	}

	public getB(key: A) {
		return this.forward.get(key)
	}

	public getOrPut(key: A, defaultValue: B) {
		const b = this.forward.get(key)
		if (b === undefined) {
			this.set(key, defaultValue)
			return defaultValue
		}
		return b
	}

	public computeIfAbsent(key: A, value: () => B) {
		const b = this.forward.get(key)
		if (b === undefined) {
			const newValue = value()
			this.set(key, newValue)
			return newValue
		}
		return b
	}
}

export async function readZip(file: File): Promise<[string, string][]> {
	const buffer = await file.arrayBuffer()
	const reader = new zip.ZipReader(new zip.BlobReader(new Blob([buffer])))
	const entries = await reader.getEntries()
	return await Promise.all(entries
		.filter(e => !e.directory)
		.map(async e => {
			const writer = new zip.TextWriter('utf-8')
			return [e.filename, await e.getData?.(writer)] as [string, string]
		})
	)
}

export async function writeZip(entries: [string, string][]): Promise<string> {
	const writer = new zip.ZipWriter(new zip.Data64URIWriter('application/zip'))
	await Promise.all(entries.map(async ([name, data]) => {
		await writer.add(name, new zip.TextReader(data))
	}))
	return await writer.close()
}

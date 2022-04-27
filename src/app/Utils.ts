import type { DataModel } from '@mcschema/core'
import { Path } from '@mcschema/core'
import { getCurrentUrl, route } from 'preact-router'
import rfdc from 'rfdc'
import config from '../config.json'

export function isPromise(obj: any): obj is Promise<any> {
	return typeof (obj as any)?.then === 'function' 
}

export function isObject(obj: any) {
	return typeof obj === 'object' && obj !== null
}

const dec2hex = (dec: number) => ('0' + dec.toString(16)).substr(-2)

export function hexId(length = 12) {
	var arr = new Uint8Array(length / 2)
	window.crypto.getRandomValues(arr)
	return Array.from(arr, dec2hex).join('')
}

export function randomSeed() {
	return BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))
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

export function getSearchParams(url: string) {
	const searchIndex = url.indexOf('?')
	if (searchIndex >= 0) {
		url = url.slice(searchIndex + 1)
		return new Map(url.split('&').map<[string, string]>(param => {
			const index = param.indexOf('=')
			if (index === -1) return [param, 'true']
			return [decodeURIComponent(param.slice(0, index)), decodeURIComponent(param.slice(index + 1))]
		}))
	}
	return new Map<string, string>()
}

export function setSeachParams(modifications: Record<string, string | undefined>, newPath?: string) {
	const url = getCurrentUrl()
	const searchParams = getSearchParams(url)
	Object.entries(modifications).forEach(([key, value]) => {
		if (value === undefined) searchParams.delete(key)
		else searchParams.set(key, value)
	})
	const search = Array.from(searchParams).map(([key, value]) =>
		`${encodeURIComponent(key)}=${encodeURIComponent(value).replaceAll('%2F', '/')}`)
	route(`${newPath ? cleanUrl(newPath) : getPath(url)}${search.length === 0 ? '' : `?${search.join('&')}`}`, true)
}

export function parseFrontMatter(source: string) {
	return Object.fromEntries(
		source.substring(3, source.indexOf('---', 3))
			.trim().split('\n')
			.filter(line => line.includes(':'))
			.map(line => line.split(':').map(s => s.trim()))
	)
}

export function stringToColor(str: string): [number, number, number] {
	const h = Math.abs(hashString(str))
	return [h % 256, (h >> 8) % 256, (h >> 16) % 256]
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
	private readonly forward: Map<A, B>
	private readonly backward: Map<B, A>

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
}

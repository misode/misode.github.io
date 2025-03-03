import * as zip from '@zip.js/zip.js'
import type { Identifier, NbtTag, Random } from 'deepslate'
import { Matrix3, Matrix4, NbtByte, NbtCompound, NbtDouble, NbtInt, NbtList, NbtString, Vector } from 'deepslate'
import type { mat3 } from 'gl-matrix'
import { quat, vec2 } from 'gl-matrix'
import yaml from 'js-yaml'
import rfdc from 'rfdc'
import { appRoute, BASE_URL } from './App.jsx'
import type { ConfigGenerator } from './Config.js'
import config from './Config.js'
import type { VersionId } from './services/index.js'
import { checkVersion } from './services/index.js'

export const SOURCE_REPO_URL = 'https://github.com/flemmli97/misode.github.io'

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
	return BigInt(Math.floor((Math.random() - 0.5) * 2 * Number.MAX_SAFE_INTEGER))
}

export function randomInt() {
	return Math.floor(Math.random() * 4294967296) - 2147483648
}

export function generateUUID() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		const r = Math.random()*16|0
		const v = c == 'x' ? r : (r&0x3|0x8)
		return v.toString(16)
	})
}

export function generateColor() {
	return Math.floor(Math.random() * 16777215)
}

function intToUnsigned(n: number) {
	n |= 0 // Force to signed 32-bit integer
	return n < 0 ? n + 0x100000000 : n
}

export function intToHexRgb(c: number | undefined) {
	return c ? '#' + (c & 0xFFFFFF).toString(16).padStart(6, '0') : '#000000'
}

export function intToDisplayHexRgb(c: number | undefined) {
	return c ? '#' + intToUnsigned(c).toString(16).toUpperCase().padStart(6, '0') : '#000000'
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
	return `/${url}/`.replaceAll(/\/\/+/g, '/')
}

export function getPath(url: string) {
	const searchIndex = url.indexOf('?')
	if (searchIndex >= 0) {
		url = url.slice(0, searchIndex)
	}
	return cleanUrl(url)
}

export function getGenerator(url: string) {
	const trimmedUrl = getPath(url).replace(BASE_URL, "").replace(/^\//, '').replace(/\/$/, '')
	return config.generators.find(g => g.url === trimmedUrl)
}

export function changeUrl({ path, search, hash, replace }: { path?: string, search?: string, hash?: string, replace?: boolean }) {
	const url = (path !== undefined ? cleanUrl(path) : location.pathname)
		+ (search !== undefined ? (search.startsWith('?') || search.length === 0 ? search : '?' + search) : location.search)
		+ (hash !== undefined ? (hash.startsWith('#') ? hash : '#' + hash) : location.hash)
	appRoute(url, replace)
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
	return Math.max(b, Math.min(a, c))
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

export async function readZip(file: File | ArrayBuffer, predicate: (name: string) => boolean = () => true): Promise<[string, Uint8Array][]> {
	const buffer = file instanceof File ? await file.arrayBuffer() : file
	const reader = new zip.ZipReader(new zip.BlobReader(new Blob([buffer])))
	const entries = await reader.getEntries()
	return await Promise.all(entries
		.filter(e => !e.directory && predicate(e.filename))
		.map(async e => {
			const writer = new zip.Uint8ArrayWriter()
			return [e.filename, await e.getData?.(writer)]
		})
	)
}

export async function writeZip(entries: [string, Uint8Array][]): Promise<string> {
	const writer = new zip.ZipWriter(new zip.Data64URIWriter('application/zip'))
	await Promise.all(entries.map(async ([name, data]) => {
		await writer.add(name, new zip.Uint8ArrayReader(data))
	}))
	return await writer.close()
}

export function shuffle<T>(array: T[]) {
	let i = array.length
	while (i != 0) {
		const j = Math.floor(Math.random() * i)
		i -= 1;
		[array[i], array[j]] = [array[j], array[i]]
	}
	return array
}

export function computeIfAbsent<K, V>(map: Map<K, V>, key: K, getter: (key: K) => V): V {
	const existing = map.get(key)
	if (existing) {
		return existing
	}
	const value = getter(key)
	map.set(key, value)
	return value
}

export async function computeIfAbsentAsync<K, V>(map: Map<K, V>, key: K, getter: (key: K) => Promise<V>): Promise<V> {
	const existing = map.get(key)
	if (existing) {
		return existing
	}
	const value = await getter(key)
	map.set(key, value)
	return value
}

export function getWeightedRandom<T>(random: Random, entries: T[], getWeight: (entry: T) => number) {
	let totalWeight = 0
	for (const entry of entries) {
		totalWeight += getWeight(entry)
	}
	if (totalWeight <= 0) {
		return undefined
	}
	let n = random.nextInt(totalWeight)
	for (const entry of entries) {
		n -= getWeight(entry)
		if (n < 0) {
			return entry
		}
	}
	return undefined
}

export function iterateWorld2D<D>(img: ImageData, transform: mat3, getData: (x: number, y: number) => D, getColor: (d: D) => [number, number, number]) {
	const pos = vec2.create()
	const arr = Array(img.width * img.height)
	for (let x = 0; x < img.width; x += 1) {
		for (let y = 0; y < img.height; y += 1) {
			const i = x + y * img.width
			vec2.transformMat3(pos, vec2.fromValues(x, y), transform)
			arr[i] = getData(Math.floor(pos[0]), -Math.floor(pos[1]))
		}
	}
	for (let i = 0; i < img.width * img.height; i += 1) {
		const color = getColor(arr[i])
		img.data[4 * i] = color[0]
		img.data[4 * i + 1] = color[1]
		img.data[4 * i + 2] = color[2]
		img.data[4 * i + 3] = 255
	}
}

function makeFloat(a: number) {
	return a > 3.4028235E38 ? Infinity : a < -3.4028235E38 ? -Infinity : a
}

const G = 3 + 2 * Math.sqrt(2)
const CS = Math.cos(Math.PI / 8)
const SS = Math.sin(Math.PI / 8)
function approxGivensQuat(a: number, b: number, c: number): [number, number] {
	const d = 2 * (a - c)
	if (makeFloat(G * b * b) < makeFloat(d * d)) {
		const e = 1 / Math.sqrt(b * b + d * d)
		return [e * b, e * d]
	} else {
		return [SS, CS]
	}
}

function qrGivensQuat(a: number, b: number): [number, number] {
	const c = Math.hypot(a, b)
	let d = c > 1e-6 ? b : 0
	let e = Math.abs(a) + Math.max(c, 1e-6)
	if (a < 0) {
		[d, e] = [e, d]
	}
	const f = 1 / Math.sqrt(e * e + d * d)
	return [d * f, e * f]
}

// modifies the passed matrix
function stepJacobi(m: Matrix3): quat {
	const q = quat.create()
	if (m.m01 * m.m01 + m.m10 * m.m10 > 1e-6) {
		const [a, b] = approxGivensQuat(m.m00, 0.5 * (m.m01 + m.m10), m.m11)
		const r = quat.fromValues(0, 0, a, b)
		const c = b * b - a * a
		const d = -2 * a * b
		quat.mul(q, q, r)
		const n = new Matrix3()
		n.m00 = c
		n.m11 = c
		n.m01 = -d
		n.m10 = d
		m.mul(n)
		n.transpose().mul(m)
		m.copy(n)
	}
	if (m.m02 * m.m02 + m.m20 * m.m20 > 1e-6) {
		const pair = approxGivensQuat(m.m00, 0.5 * (m.m02 + m.m20), m.m22)
		const a = -pair[0]
		const b = pair[1]
		const r = quat.fromValues(0, a, 0, b)
		const c = b * b - a * a
		const d = -2 * a * b
		quat.mul(q, q, r)
		const n = new Matrix3()
		n.m00 = c
		n.m22 = c
		n.m02 = d
		n.m20 = -d
		m.mul(n)
		n.transpose().mul(m)
		m.copy(n)
	}
	if (m.m12 * m.m12 + m.m21 * m.m21 > 1e-6) {
		const [a, b] = approxGivensQuat(m.m11, 0.5 * (m.m12 + m.m21), m.m22)
		const r = quat.fromValues(a, 0, 0, b)
		const c = b * b - a * a
		const d = -2 * a * b
		quat.mul(q, q, r)
		const n = new Matrix3()
		n.m11 = c
		n.m22 = c
		n.m12 = -d
		n.m21 = d
		m.mul(n)
		n.transpose().mul(m)
		m.copy(n)
	}
	return q
}

export function svdDecompose(m: Matrix3): [quat, Vector, quat] {
	const q = quat.create()
	const r = quat.create()
	const n = m.clone()
		.transpose()
		.mul(m)

	for (let i = 0; i < 5; i += 1) {
		quat.mul(r, r, stepJacobi(n))
	}
	quat.normalize(r, r)
	const p0 = m.clone()
		.mul(Matrix3.fromQuat(r))

	const [a1, b1] = m.m00 < 1e-6
		? qrGivensQuat(p0.m11, -p0.m10)
		: qrGivensQuat(p0.m00, p0.m01)
	const c1 = b1 * b1 - a1 * a1
	const d1 = -2 * a1 * b1
	const s1 = quat.fromValues(0, 0, a1, b1)
	quat.mul(q, q, s1)
	const p1 = new Matrix3()
	p1.m00 = c1
	p1.m11 = c1
	p1.m01 = d1
	p1.m10 = -d1
	p1.mul(p0)

	const pair = m.m00 < 1e-6
		? qrGivensQuat(p1.m22, -p1.m20)
		: qrGivensQuat(p1.m00, p1.m02)
	const a2 = -pair[0]
	const b2 = pair[1]
	const c2 = b2 * b2 - a2 * a2
	const d2 = -2 * a2 * b2
	const s2 = quat.fromValues(0, a2, 0, b2)
	quat.mul(q, q, s2)
	const p2 = new Matrix3()
	p2.m00 = c2
	p2.m22 = c2
	p2.m02 = -d2
	p2.m20 = d2
	p2.mul(p1)

	const [a3, b3] = m.m11 < 1e-6
		? qrGivensQuat(p2.m22, -p2.m21)
		: qrGivensQuat(p2.m11, p2.m12)
	const c3 = b3 * b3 - a3 * a3
	const d3 = -2 * a3 * b3
	const s3 = quat.fromValues(a3, 0, 0, b3)
	quat.mul(q, q, s3)
	const p3 = new Matrix3()
	p3.m11 = c3
	p3.m22 = c3
	p3.m12 = d3
	p3.m21 = -d3
	p3.mul(p2)

	quat.scale(q, q, Math.sqrt(1))
	const scale = new Vector(p3.m00, p3.m11, p3.m22)
	quat.conjugate(r, r)
	return [q, scale, r]
}

export function composeMatrix(translation: Vector, leftRotation: quat, scale: Vector, rightRotation: quat) {
	return new Matrix4()
		.translate(translation)
		.mul(Matrix4.fromQuat(leftRotation))
		.scale(scale)
		.mul(Matrix4.fromQuat(rightRotation))
}

export interface PatchLine {
	line: string
	before?: number
	after?: number
}

export function parseGitPatch(patch: string) {
	const source = patch.split('\n')
	const result: PatchLine[] = []
	let before = 1
	let after = 1
	for (let i = 0; i < source.length; i += 1) {
		const line = source[i]
		if (line.startsWith('Index: ') || line.startsWith('===')
			|| line.startsWith('---') || line.startsWith('+++')
			|| line.startsWith('\\') || line.length === 0) {
			continue
		}
		if (line.startsWith('@')) {
			const match = line.match(/^@@ -(\d+)(?:,(?:\d+))? \+(\d+)(?:,(?:\d+))? @@/)
			if (!match) throw new Error(`Invalid patch pattern at line ${i+1}: ${line}`)
			result.push({ line })
			before = Number(match[1])
			after = Number(match[2])
		} else if (line.startsWith(' ')) {
			result.push({ line, before, after })
			before += 1
			after += 1
		} else if (line.startsWith('+')) {
			result.push({ line, after })
			after += 1
		} else if (line.startsWith('-')) {
			result.push({ line, before })
			before += 1
		} else {
			throw new Error(`Invalid patch, got '${line.charAt(0)}' at line ${i+1}`)
		}
	}
	return result
}

const legacyFolders = new Set(['loot_table', 'predicate', 'item_modifier', 'advancement', 'recipe', 'tag/function', 'tag/item', 'tag/block', 'tag/fluid', 'tag/entity_type', 'tag/game_event'])
export function genPath(gen: ConfigGenerator, version: VersionId) {
	const path = gen.path ?? gen.id
	if (!checkVersion(version, '1.21') && legacyFolders.has(gen.id)) {
		return path + 's'
	}
	return path
}

export function jsonToNbt(value: unknown): NbtTag {
	if (typeof value === 'string') {
		return new NbtString(value)
	}
	if (typeof value === 'number') {
		return Number.isInteger(value) ? new NbtInt(value) : new NbtDouble(value)
	}
	if (typeof value === 'boolean') {
		return new NbtByte(value)
	}
	if (Array.isArray(value)) {
		return new NbtList(value.map(jsonToNbt))
	}
	if (typeof value === 'object' && value !== null) {
		return new NbtCompound(
			new Map(Object.entries(value ?? {})
				.map(([k, v]) => [k, jsonToNbt(v)]))
		)
	}
	return new NbtByte(0)
}

export function mergeTextComponentStyles(text: unknown, style: Record<string, unknown>) {
	if (typeof text === 'string') {
		return { ...style, text }
	}
	if (Array.isArray(text)) {
		return { ...style, ...text[0], extra: text.slice(1) }
	}
	if (typeof text === 'object' && text !== null) {
		return { ...style, ...text }
	}
	return { ...style, text: '' }
}

export function makeDescriptionId(prefix: string, id: Identifier | undefined) {
	if (id === undefined) {
		return `${prefix}.unregistered_sadface`
	}
	return `${prefix}.${id.namespace}.${id.path.replaceAll('/', '.')}`
}

export function safeJsonParse(text: string): any {
	try {
		return JSON.parse(text)
	} catch (e) {
		return undefined
	}
}

export function isPromise(obj: any): obj is Promise<any> {
	return typeof (obj as any)?.then === 'function' 
}

const dec2hex = (dec: number) => ('0' + dec.toString(16)).substr(-2)

export function hexId(length = 12) {
	var arr = new Uint8Array(length / 2)
	window.crypto.getRandomValues(arr)
	return Array.from(arr, dec2hex).join('')
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

export function stringToColor(str: string): [number, number, number] {
	const h = Math.abs(hashString(str))
	return [h % 256, (h >> 8) % 256, (h >> 16) % 256]
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

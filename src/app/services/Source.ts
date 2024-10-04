import { NbtTag } from 'deepslate'
import yaml from 'js-yaml'
import { Store } from '../Store.js'
import { jsonToNbt } from '../Utils.js'

const INDENTS: Record<string, number | string | undefined> = {
	'2_spaces': 2,
	'4_spaces': 4,
	tabs: '\t',
	minified: undefined,
}

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let commentJson: typeof import('comment-json') | null = null

const FORMATS: Record<string, {
	parse: (v: string) => Promise<unknown>,
	stringify: (v: unknown, indentation: string | number | undefined) => string,
}> = {
	json: {
		parse: async (v) => {
			try {
				return JSON.parse(v)
			} catch (e) {
				commentJson = await import('comment-json')
				return commentJson.parse(v)
			}
		},
		stringify: (v, i) => (commentJson ?? JSON).stringify(v, null, i) + '\n',
	},
	snbt: {
		parse: async (v) => NbtTag.fromString(v).toSimplifiedJson(),
		stringify: (v, i) => {
			const tag = jsonToNbt(v)
			if (i === undefined) {
				return tag.toString()
			}
			return tag.toPrettyString(typeof i === 'number' ? ' '.repeat(i) : i)
		},
	},
	yaml: {
		parse: async (v) => yaml.load(v),
		stringify: (v, i) => yaml.dump(v, {
			flowLevel: i === undefined ? 0 : -1,
			indent: typeof i === 'string' ? 4 : i,
		}),
	},
}

export function stringifySource(data: unknown, format?: string, indent?: string) {
	return FORMATS[format ?? Store.getFormat()].stringify(data, INDENTS[indent ?? Store.getIndent()])
}

export async function parseSource(data: string, format: string) {
	return await FORMATS[format].parse(data)
}

export function getSourceIndent(indent: string) {
	return INDENTS[indent]
}

export function getSourceIndents() {
	return Object.keys(INDENTS)
}

export function getSourceFormats() {
	return Object.keys(FORMATS)
}

export function sortData(data: any): any {
	if (typeof data !== 'object' || data === null) {
		return data
	}
	if (Array.isArray(data)) {
		return data.map(sortData)
	}
	const ordered = Object.create(null)
	for (const symbol of Object.getOwnPropertySymbols(data)) {
		ordered[symbol] = data[symbol]
	}
	const orderedKeys = Object.keys(data).sort(customOrder)
	for (const key of orderedKeys) {
		ordered[key] = sortData(data[key])
	}
	return ordered
}

const priority = ['type', 'parent']
function customOrder(a: string, b: string) {
	return (priority.indexOf(a) + 1 || Infinity) - (priority.indexOf(b) + 1 || Infinity)
		|| a.localeCompare(b)
}

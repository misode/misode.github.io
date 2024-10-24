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

const FORMATS: Record<string, {
	parse: (source: string) => string,
	stringify: (source: string, indent: string | number | undefined) => string,
}> = {
	json: {
		parse: (s) => s,
		stringify: (s) => s,
	},
	snbt: {
		parse: (s) => JSON.stringify(NbtTag.fromString(s).toSimplifiedJson(), null, 2),
		stringify: (s, i) => {
			const tag = jsonToNbt(JSON.parse(s))
			if (i === undefined) {
				return tag.toString()
			}
			return tag.toPrettyString(typeof i === 'number' ? ' '.repeat(i) : i)
		},
	},
	yaml: {
		parse: (s) => JSON.stringify(yaml.load(s), null, 2),
		stringify: (s, i) => yaml.dump(JSON.parse(s), {
			flowLevel: i === undefined ? 0 : -1,
			indent: typeof i === 'string' ? 4 : i,
		}),
	},
}

export function stringifySource(source: string, format?: string, indent?: string) {
	return FORMATS[format ?? Store.getFormat()].stringify(source, INDENTS[indent ?? Store.getIndent()])
}

export async function parseSource(source: string, format: string) {
	return FORMATS[format].parse(source)
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

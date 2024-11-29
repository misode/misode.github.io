import { Identifier, ItemStack, Json, NbtCompound, NbtString, NbtTag, StringReader } from 'deepslate'
import { route } from 'preact-router'
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'
import config from '../../config.json'
import { Footer, Octicon } from '../components/index.js'
import { useLocale } from '../contexts/Locale.jsx'
import { useTitle } from '../contexts/Title.jsx'
import { useActiveTimeout } from '../hooks/useActiveTimout.js'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import type { VersionId } from '../services/Versions.js'
import { checkVersion } from '../services/Versions.js'
import { jsonToNbt } from '../Utils.js'

const FORMATS = ['give-command', 'loot-table'] as const
type Format = typeof FORMATS[number]

interface Props {
	path?: string,
	formats?: string,
}
export function Convert({ formats }: Props) {
	const {locale} = useLocale()

	const [source, setSource] = useState<Format>()
	const [target, setTarget] = useState<Format>()

	useEffect(() => {
		const match = formats?.match(/^([a-z0-9-]+)-to-([a-z0-9-]+)/)
		if (match && FORMATS.includes(match[1] as Format)) {
			setSource(match[1] as Format)
		}
		if (match && FORMATS.includes(match[2] as Format)) {
			setTarget(match[2] as Format)
		}
	}, [formats])

	const supportedVersions = useMemo(() => {
		return config.versions
			.filter(v => checkVersion(v.id, '1.20.5'))
			.map(v => v.id as VersionId)
			.reverse()
	}, [])

	const title = !source || !target
		?	locale('title.convert')
		: locale('title.convert.formats', locale(`convert.format.${source}`), locale(`convert.format.${target}`))
	useTitle(title, supportedVersions)

	const [input, setInput] = useLocalStorage('misode_convert_input', '')

	const convertFn = useMemo(() => {
		if (!source || !target) {
			return undefined
		}
		if (source === target) {
			return (input: string) => input
		}
		return CONVERSIONS[source][target]
	}, [source, target])

	const { output, error } = useMemo(() => {
		if (!convertFn) {
			return { output: '' }
		}
		try {
			return { output: convertFn(input) }
		} catch (e) {
			return { output: '', error: e instanceof Error ? e : undefined }
		}
	}, [convertFn, input])

	const changeSource = useCallback((newSource: Format) => {
		setSource(newSource)
		if (target === newSource) {
			setTarget(source)
			setInput(output)
		}
		if (target) {
			route(`/convert/${newSource}-to-${target === newSource ? source : target}`)
		}
	}, [source, target])

	const changeTarget = useCallback((newTarget: Format) => {
		setTarget(newTarget)
		if (source === newTarget) {
			setSource(target)
			setInput(output)
		}
		if (source) {
			route(`/convert/${source === newTarget ? target : source}-to-${newTarget}`)
		}
	}, [source])

	const onSwap = useCallback(() => {
		setSource(target)
		setTarget(source)
		if (output.length > 0) {
			setInput(output)
		}
		if (source && target) {
			route(`/convert/${target}-to-${source}`)
		}
	}, [source, target, output])

	const [copyActive, setCopyActive] = useActiveTimeout()
	const onCopyOutput = useCallback(async () => {
		await navigator.clipboard.writeText(output)
		setCopyActive()
	}, [output])

	return <main>
		<div class="legacy-container">
			<div class="flex my-4 justify-center">
				<FormatSelect value={source} onChange={changeSource} />
				<button class="mx-3 tooltipped tip-s" aria-label={locale('convert.swap')} onClick={onSwap}>{Octicon.arrow_switch}</button>
				<FormatSelect value={target} onChange={changeTarget} />
			</div>
			<div class="flex">
				<div class="relative w-full mr-2">
					<textarea class="convert-textarea block resize-none w-full font-mono text-sm px-2 py-1 rounded" value={input} onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}></textarea>
					{error && <div class="convert-error absolute bottom-0 left-0 w-full p-2 pr-6">{error.message}</div>}
				</div>
				<div class="relative w-full ml-2">
					<textarea class="convert-textarea block resize-none w-full font-mono text-sm px-2 py-1 rounded" value={output} readonly></textarea>
					<button class={`absolute top-0 right-0 m-4 mr-5 tooltipped tip-s ${copyActive ? 'status-icon active' : ''}`} aria-label={locale(copyActive ? 'copied' : 'copy')} onClick={onCopyOutput}>{copyActive ? Octicon.check : Octicon.copy}</button>
				</div>
			</div>
		</div>
		<Footer />
	</main>
}

interface FormatSelectProps {
	value: string | undefined
	onChange: (newValue: Format) => void
}
function FormatSelect({ value, onChange }: FormatSelectProps) {
	const { locale } = useLocale()
	return <select class="convert-select text-xl px-3 py-1 rounded" value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value as Format)}>
		{value === undefined && <option value={undefined}>{locale('convert.select')}</option>}
		{FORMATS.map(format => <option value={format}>{locale(`convert.format.${format}`)}</option>)}
	</select>
}

const CONVERSIONS: Record<Format, Partial<Record<Format, (input: string) => string>>> = {
	'give-command': {
		'loot-table': (input) => {
			const itemStack = parseGiveCommand(new StringReader(input))
			const lootTable = createLootTable(itemStack)
			return JSON.stringify(lootTable, null, 2)
		},
	},
	'loot-table': {
		'give-command': (input) => {
			const lootTable = JSON.parse(input)
			const itemStack = getItemFromLootTable(lootTable)
			return `give @s ${stringifyItemStack(itemStack)}`
		},
	},
}

function parseGiveCommand(reader: StringReader) {
	if (reader.peek() === '/') {
		reader.skip()
	}
	if (reader.peek() === 'g' && reader.peek(1) === 'i' && reader.peek(2) === 'v' && reader.peek(3) === 'e') {
		reader.cursor += 4
		reader.expect(' ')
		reader.expect('@')
		if (reader.peek().match(/[parsen]/)) {
			reader.skip()
		} else {
			throw reader.createError("Expected 'p', 'a', 'r', 's', 'e', or 'n'")
		}
		reader.expect(' ')
	}
	const item = parseIdentifier(reader)
	const components = parseComponents(reader)
	let count = 1
	if (reader.peek() === ' ') {
		reader.skip()
		count = reader.readInt()
	}
	return new ItemStack(item, count, components)
}


function parseComponents(reader: StringReader) {
	const components = new Map<string, NbtTag>()
	if (reader.peek() !== '[') {
		return components
	}
	reader.skip()
	reader.skipWhitespace()
	while (reader.peek() !== ']') {
		if (reader.peek() === '!') {
			reader.skip()
			reader.skipWhitespace()
			const key = parseIdentifier(reader)
			components.set('!' + key, new NbtCompound())
			reader.skipWhitespace()
		} else {
			const key = parseIdentifier(reader)
			reader.skipWhitespace()
			reader.expect('=')
			reader.skipWhitespace()
			const tag = NbtTag.fromString(reader)
			reader.skipWhitespace()
			if (key.is('custom_data')) {
				components.set(key.toString(), new NbtString(tag.toString()))
			} else {
				components.set(key.toString(), tag)
			}
		}
		if (reader.peek() === ']') {
			break
		} else if (reader.peek() === ',') {
			reader.skip()
			reader.skipWhitespace()
			continue
		}
		throw reader.createError("Expected ',' or ']'")
	}
	reader.skip()
	return components
}

function parseIdentifier(reader: StringReader) {
	const start = reader.cursor
	while (reader.canRead() && reader.peek().match(/[a-z0-9_.:\/-]/)) {
		reader.skip()
	}
	const result = reader.getRead(start)
	if (result.length === 0) {
		throw reader.createError('Expected a resource location')
	}
	return Identifier.parse(result)
}

function createLootTable(item: ItemStack) {
	return {
		pools: [
			{
				rolls: 1,
				entries: [
					{
						type: 'minecraft:item',
						name: item.id.toString(),
						functions: (item.components.size > 0 || item.count > 1)
							? [
								...item.components.size > 0 ? [{
									function: 'minecraft:set_components',
									components: Object.fromEntries([...item.components.entries()].map(([key, value]) => {
										return [key, value.toSimplifiedJson()]
									})),
								}] : [],
								...item.count > 1 ? [{
									function: 'minecraft:set_count',
									count: item.count,
								}]: [],
							]
							: undefined,
					},
				],
			},
		],
	}
}

function getItemFromLootTable(data: unknown): ItemStack {
	const root = Json.readObject(data) ?? {}
	const pools = Json.readArray(root.pools, e => Json.readObject(e) ?? {}) ?? []
	if (pools.length === 0) {
		throw new Error('Expected a pool')
	}
	const pool = pools[0]
	const entries = Json.readArray(pool.entries, e => Json.readObject(e) ?? {}) ?? []
	if (entries.length === 0) {
		throw new Error('Expected an entry')
	}
	const entry = entries[0]
	const type = Json.readString(entry.type)
	if (type?.replace(/^minecraft:/, '') !== 'item') {
		throw new Error('Expected "type" to be "minecraft:item"')
	}
	const name = Json.readString(entry.name)
	if (!name) {
		throw new Error('Expected "name"')
	}
	const functions = [
		...Json.readArray(entry.functions, e => Json.readObject(e) ?? {}) ?? [],
		...Json.readArray(pool.functions, e => Json.readObject(e) ?? {}) ?? [],
		...Json.readArray(root.functions, e => Json.readObject(e) ?? {}) ?? [],
	]
	let count = 1
	const components = new Map<string, NbtTag>()
	for (const fn of functions) {
		const type = Json.readString(fn.function)?.replace(/^minecraft:/, '')
		switch (type) {
			case 'set_count':
				const value = Json.readInt(fn.count)
				if (value) {
					count = value
				}
				break
			case 'set_components':
				const newComponents = Json.readObject(fn.components) ?? {}
				for (const [key, value] of Object.entries(newComponents)) {
					components.set(key, jsonToNbt(value))
				}
		}
	}
	return new ItemStack(Identifier.parse(name), count, components)
}

function stringifyItemStack(itemStack: ItemStack) {
	let result = itemStack.id.toString()
	if (itemStack.components.size > 0) {
		result += `[${[...itemStack.components.entries()].map(([k, v]) => {
			return k.startsWith('!') ? k : `${k}=${v.toString()}`
		}).join(',')}]`
	}
	if (itemStack.count > 1) {
		result += ` ${itemStack.count}`
	}
	return result
}

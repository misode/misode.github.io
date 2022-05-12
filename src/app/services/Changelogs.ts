import { isObject } from '../Utils'

const repo = 'https://raw.githubusercontent.com/misode/technical-changes/main'

export type Change = {
	group: string,
	version: string,
	order: number,
	tags: string[],
	content: string,
}

let Changelogs: Change[] | Promise<Change[]> | null = null

export async function getChangelogs() {
	if (!Changelogs) {
		const index = await (await fetch(`${repo}/index.json`)).json() as string[]
		Changelogs = (await Promise.all(
			index.map((group, i) => fetchGroup(parseVersion(group), i))
		)).flat().map<Change>(change => ({
			...change,
			tags: [change.group, ...change.tags],
		}))
	}
	return Changelogs
}

async function fetchGroup(group: string, groupIndex: number) {
	const index = await (await fetch(`${repo}/${group}/index.json`)).json() as string[]
	return (await Promise.all(
		index.map((version, i) => fetchChangelog(group, parseVersion(version), groupIndex, i))
	)).flat()
}

async function fetchChangelog(group: string, version: string, groupIndex: number, versionIndex: number) {
	const text = await (await fetch(`${repo}/${group}/${version}.md`)).text()
	return parseChangelog(text).map(change => ({
		version,
		group,
		order: groupIndex * 1000 + versionIndex,
		...change,
	}))
}

function parseChangelog(text: string) {
	return text.split('\n\n')
		.map(entry => {
			const i = entry.indexOf('|')
			return {
				tags: entry.substring(0, i).trim().split(' '),
				content: entry.slice(i + 1).trim()
					.replaceAll('->', '→')
					.replaceAll('\n...\n', '\n\n'),
			}
		})
}

function parseVersion(version: unknown): string {
	if (typeof version === 'string') {
		return version
	} else if (isObject(version)) {
		return version.id
	}
	return 'unknown'
}

const ARTICLE_PREFIX = 'https://www.minecraft.net/article/'
const ARTICLE_OVERRIDES = new Map(Object.entries({
	1.17: 'caves---cliffs--part-i-out-today-java',
	1.18: 'caves---cliffs--part-ii-out-today-java',
	'1.18.2': 'minecraft-java-edition-1-18-2',
}))

export function getArticleLink(version: string): string | undefined {
	const override = ARTICLE_OVERRIDES.get(version)
	if (override) {
		return ARTICLE_PREFIX + override
	}
	if (version.match(/^\d\dw\d\d[a-z]$/)) {
		return ARTICLE_PREFIX + 'minecraft-snapshot-' + version
	}
	if (version.match(/^\d+\.\d+(\.\d+)?-(pre|rc)[0-9]+$/)) {
		return ARTICLE_PREFIX + 'minecraft-' + version.replaceAll('.', '-').replaceAll('pre', 'pre-release-')
	}
	return undefined
}

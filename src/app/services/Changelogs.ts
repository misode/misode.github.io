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
	'1.16-pre2': 'minecraft-1-16-pre-release-1',
	'1.16-pre4': 'minecraft-1-16-pre-release-3',
	'1.16-pre5': 'minecraft-1-16-pre-release-3',
	'1.16-pre7': 'minecraft-1-16-pre-release-6',
	'1.16-pre8': 'minecraft-1-16-pre-release-6',
	'1.16-rc1': 'minecraft-1-16-release-candidate',
	1.16: 'nether-update-java',
	'1.16.2-pre3': 'minecraft-1-16-2-pre-release-2',
	'1.16.2-rc1': 'minecraft-1-16-2-pre-release-2',
	'1.16.2-rc2': 'minecraft-1-16-2-pre-release-2',
	'1.17-pre3': 'minecraft-1-17-pre-release-2',
	'1.17-pre4': 'minecraft-1-17-pre-release-2',
	'1.17-pre5': 'minecraft-1-17-pre-release-2',
	'1.17.1-pre3': 'minecraft-1-17-1-pre-release-2',
	1.17: 'caves---cliffs--part-i-out-today-java',
	'1.18-pre3': 'minecraft-1-18-pre-release-2',
	'1.18-pre4': 'minecraft-1-18-pre-release-2',
	'1.18-pre5': 'minecraft-1-18-pre-release-2',
	'1.18-pre7': 'minecraft-1-18-pre-release-6',
	'1.18-pre8': 'minecraft-1-18-pre-release-6',
	1.18: 'caves---cliffs--part-ii-out-today-java',
	'1.18.2-pre3': 'minecraft-1-18-2-pre-release-2',
}))

export function getArticleLink(version: string): string | undefined {
	const override = ARTICLE_OVERRIDES.get(version)
	if (override) {
		return ARTICLE_PREFIX + override
	}
	let match
	if ((match = version.match(/^(\d\dw\d\d)[a-z]$/)) && match[1]) {
		return ARTICLE_PREFIX + 'minecraft-snapshot-' + match[1] + 'a'
	}
	if ((match = version.match(/^(\d+\.\d+(?:\.\d+)?)-pre([0-9]+)$/)) && match[1] && match[2]) {
		return ARTICLE_PREFIX + 'minecraft-' + match[1].replaceAll('.', '-') + '-pre-release-' + match[2]
	}
	if ((match = version.match(/^(\d+\.\d+(?:\.\d+)?)-rc[0-9]+$/)) && match[1]) {
		return ARTICLE_PREFIX + 'minecraft-' + match[1].replaceAll('.', '-') + '-release-candidate-1' 
	}
	if (version.match(/^\d+\.\d+\.\d+$/)) {
		return ARTICLE_PREFIX + 'minecraft-java-edition-' + version.replaceAll('.', '-')
	}
	return undefined
}

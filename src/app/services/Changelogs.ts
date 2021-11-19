import { isObject } from '../Utils'

const repo = 'https://raw.githubusercontent.com/misode/technical-changes/main'

export type ChangelogEntry = {
	group: ChangelogVersion,
	version: ChangelogVersion,
	order: number,
	tags: string[],
	content: string,
}

export type ChangelogVersion = {
	id: string,
	article: string | null,
}

let Changelogs: ChangelogEntry[] | Promise<ChangelogEntry[]> | null = null

export async function getChangelogs() {
	if (!Changelogs) {
		const index = await (await fetch(`${repo}/index.json`)).json() as string[]
		Changelogs = (await Promise.all(
			index.map((group, i) => fetchGroup(parseVersion(group), i))
		)).flat().map<ChangelogEntry>(change => ({
			...change,
			tags: [change.group.id, ...change.tags],
		}))
	}
	return Changelogs
}

async function fetchGroup(group: ChangelogVersion, groupIndex: number) {
	const index = await (await fetch(`${repo}/${group.id}/index.json`)).json() as string[]
	return (await Promise.all(
		index.map((version, i) => fetchChangelog(group, parseVersion(version), groupIndex, i))
	)).flat()
}

async function fetchChangelog(group: ChangelogVersion, version: ChangelogVersion, groupIndex: number, versionIndex: number) {
	const text = await (await fetch(`${repo}/${group.id}/${version.id}.md`)).text()
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

function parseVersion(version: unknown): ChangelogVersion {
	if (typeof version === 'string') {
		return {
			id: version,
			article: version.match(/\d\dw\d\d[a-z]/) ? 'minecraft-snapshot-' + version : version.match(/\d+\.\d+(\.\d+)?-pre[0-9]+/) ? 'minecraft-' + version.replaceAll('.', '-').replaceAll('pre', 'pre-release-') : null,
		}
	} else if (isObject(version)) {
		return version as ChangelogVersion
	}
	return { id: 'unknown', article: null }
}

const repo = 'https://raw.githubusercontent.com/misode/technical-changes/main'

export type ChangelogEntry = {
	group: string,
	version: string,
	tags: string[],
	content: string,
}

let Changelogs: ChangelogEntry[] | Promise<ChangelogEntry[]> | null = null

export async function getChangelogs() {
	if (!Changelogs) {
		const index = await (await fetch(`${repo}/index.json`)).json() as string[]
		Changelogs = (await Promise.all(
			index.map(group => fetchGroup(group))
		)).flat()
	}
	return Changelogs
}

async function fetchGroup(group: string) {
	const index = await (await fetch(`${repo}/${group}/index.json`)).json() as string[]
	return (await Promise.all(
		index.map(version => fetchChangelog(group, version))
	)).flat()
}

async function fetchChangelog(group: string, version: string) {
	const text = await (await fetch(`${repo}/${group}/${version}.md`)).text()
	return parseChangelog(text).map(change => ({
		version,
		group,
		...change,
	}))
}

function parseChangelog(text: string) {
	return text.split('\n\n')
		.map(entry => {
			const i = entry.indexOf('|')
			return {
				tags: entry.substring(0, i).trim().split(' '),
				content: entry.slice(i + 1).trim(),
			}
		})
}

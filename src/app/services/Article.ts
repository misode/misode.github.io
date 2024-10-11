const ARTICLE_PREFIX = 'https://www.minecraft.net/article/'

const ARTICLE_OVERRIDES = new Map(Object.entries({
	'1.16-pre2': 'minecraft-1-16-pre-release-1',
	'1.16-pre4': 'minecraft-1-16-pre-release-3',
	'1.16-pre5': 'minecraft-1-16-pre-release-3',
	'1.16-pre7': 'minecraft-1-16-pre-release-6',
	'1.16-pre8': 'minecraft-1-16-pre-release-6',
	'1.16-rc1': 'minecraft-1-16-release-candidate',
	'1.16': 'nether-update-java',
	'1.16.2-pre3': 'minecraft-1-16-2-pre-release-2',
	'1.16.2-rc1': 'minecraft-1-16-2-pre-release-2',
	'1.16.2-rc2': 'minecraft-1-16-2-pre-release-2',
	'1.17-pre3': 'minecraft-1-17-pre-release-2',
	'1.17-pre4': 'minecraft-1-17-pre-release-2',
	'1.17-pre5': 'minecraft-1-17-pre-release-2',
	'1.17.1-pre3': 'minecraft-1-17-1-pre-release-2',
	'1.17-rc2': 'minecraft-1-17-release-candidate-1',
	'1.17': 'caves---cliffs--part-i-out-today-java',
	'1.17.1-rc2': 'minecraft-1-17-1-release-candidate-1',
	'1.18-pre3': 'minecraft-1-18-pre-release-2',
	'1.18-pre4': 'minecraft-1-18-pre-release-2',
	'1.18-pre5': 'minecraft-1-18-pre-release-2',
	'1.18-pre7': 'minecraft-1-18-pre-release-6',
	'1.18-pre8': 'minecraft-1-18-pre-release-6',
	'1.18-rc2': 'minecraft-1-18-release-candidate-1',
	'1.18-rc3': 'minecraft-1-18-release-candidate-1',
	'1.18-rc4': 'minecraft-1-18-release-candidate-1',
	'1.18': 'caves---cliffs--part-ii-out-today-java',
	'1.18.1-rc2': 'minecraft-1-18-1-release-candidate-1',
	'1.18.1-rc3': 'minecraft-1-18-1-release-candidate-1',
	'1.18.2-pre3': 'minecraft-1-18-2-pre-release-2',
	'1.18.2-pre5': 'minecraft-1-18-2-pre-release-4',
	'1.19-pre3': 'minecraft-1-19-pre-release-2',
	'1.19-pre5': 'minecraft-1-19-pre-release-4',
	'1.19-rc2': 'minecraft-1-19-release-candidate-1',
	'1.19': 'the-wild-update-out-today-java',
	'1.19.1-pre4': 'minecraft-1-19-1-pre-release-3',
	'1.19.2-rc2': 'minecraft-1-19-2-release-candidate-1',
	'1.19.3-pre2': 'minecraft-1-19-3-pre-release-1',
	'1.19.3-rc2': 'minecraft-1-19-3-release-candidate-1',
	'1.19.4-pre3': 'minecraft-1-19-4-pre-release-2',
	'1.19.4-rc2': 'minecraft-1-19-4-release-candidate-1',
	'1.20-pre3': 'minecraft-1-20-pre-release-2',
	'1.20-pre4': 'minecraft-1-20-pre-release-2',
	'1.20-pre6': 'minecraft-1-20-pre-release-5',
	'1.20': 'trails-tales-update-out-today-java',
	'1.20.1': 'minecraft--java-edition-1-20-1',
	'1.20.2-pre2': 'minecraft-1-20-2-pre-release-1',
	'23w43b': 'minecraft-snapshot-23w43b',
	'24w03b': 'minecraft-snapshot-24w03b',
	'24w05b': 'minecraft-snapshot-24w05b',
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
	if ((match = version.match(/^(\d+\.\d+(?:\.\d+)?)-rc([0-9]+)$/)) && match[1]) {
		return ARTICLE_PREFIX + 'minecraft-' + match[1].replaceAll('.', '-') + '-release-candidate-' + match[2] 
	}
	if (version.match(/^\d+\.\d+(\.\d+)?$/)) {
		return ARTICLE_PREFIX + 'minecraft-java-edition-' + version.replaceAll('.', '-')
	}
	return undefined
}

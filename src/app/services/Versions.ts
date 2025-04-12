import config from '../Config.js'

export const VersionIds = ['1.15', '1.16', '1.17', '1.18', '1.18.2', '1.19', '1.19.3', '1.19.4', '1.20', '1.20.2', '1.20.3', '1.20.5', '1.21', '1.21.2', '1.21.4', '1.21.5', '1.21.6'] as const
export type VersionId = typeof VersionIds[number]

export const DEFAULT_VERSION: VersionId = '1.21.5'

export function checkVersion(versionId: string, minVersionId: string | undefined, maxVersionId?: string) {
	const version = config.versions.findIndex(v => v.id === versionId)
	const minVersion = minVersionId ? config.versions.findIndex(v => v.id === minVersionId) : 0
	const maxVersion = maxVersionId ? config.versions.findIndex(v => v.id === maxVersionId) : config.versions.length - 1
	return minVersion <= version && version <= maxVersion
}

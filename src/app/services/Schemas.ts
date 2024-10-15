import config from '../Config.js'
import { message } from '../Utils.js'
import type { BlockStateData } from './DataFetcher.js'
import { fetchBlockStates, fetchRegistries } from './DataFetcher.js'

export const VersionIds = ['1.15', '1.16', '1.17', '1.18', '1.18.2', '1.19', '1.19.3', '1.19.4', '1.20', '1.20.2', '1.20.3', '1.20.5', '1.21', '1.21.2'] as const
export type VersionId = typeof VersionIds[number]

export const DEFAULT_VERSION: VersionId = '1.21'

interface VersionData {
	registries: Map<string, string[]>
	blockStates: Map<string, BlockStateData>
}

const Versions: Record<string, VersionData | Promise<VersionData>> = {}

async function getVersion(id: VersionId): Promise<VersionData> {
	if (!Versions[id]) {
		Versions[id] = (async () => {
			try {
				const registries = await fetchRegistries(id)
				const blockStates= await fetchBlockStates(id)
				Versions[id] = { registries, blockStates }
				return Versions[id]
			} catch (e) {
				throw new Error(`Cannot get version "${id}": ${message(e)}`)
			}
		})()
		return Versions[id]
	}
	return Versions[id]
}

export async function getBlockStates(version: VersionId): Promise<Map<string, BlockStateData>> {
	const versionData = await getVersion(version)
	return versionData.blockStates
}

export function checkVersion(versionId: string, minVersionId: string | undefined, maxVersionId?: string) {
	const version = config.versions.findIndex(v => v.id === versionId)
	const minVersion = minVersionId ? config.versions.findIndex(v => v.id === minVersionId) : 0
	const maxVersion = maxVersionId ? config.versions.findIndex(v => v.id === maxVersionId) : config.versions.length - 1
	return minVersion <= version && version <= maxVersion
}

export interface FileModel {
	get text(): string
	get data(): any
}

export function createMockFileModel(): FileModel {
	return {
		text: '{}',
		data: {},
	}
}

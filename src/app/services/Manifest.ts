import { fetchAssets, fetchManifest, fetchSounds } from './DataFetcher'
import type { VersionId } from './Schemas'

export type VersionManifest = {
	latest: {
		release: string,
		snapshot: string,
	},
	versions: {
		id: string,
		type: string,
		url: string,
	}[],
}
let Manifest: VersionManifest | Promise<VersionManifest> | null = null

export type VersionAssets = {
	[key: string]: {
		hash: string,
	},
}
const VersionAssets: Record<string, VersionAssets | Promise<VersionAssets>> = {}

export type SoundEvents = {
	[key: string]: {
		sounds: (string | { name: string })[],
	},
}
const SoundEvents: Record<string, SoundEvents | Promise<SoundEvents>> = {}

export async function getManifest() {
	if (!Manifest) {
		Manifest = fetchManifest()
	}
	return Manifest
}

export async function getAssets(version: VersionId) {
	if (!VersionAssets[version]) {
		VersionAssets[version] = (async () => {
			const manifest = await getManifest()
			return await fetchAssets(version, manifest)
		})()
	}
	return VersionAssets[version]
}

export async function getSounds(version: VersionId) {
	if (!SoundEvents[version]) {
		SoundEvents[version] = (async () => {
			const assets = await getAssets(version)
			return await fetchSounds(version, assets)
		})()
	}
	return SoundEvents[version]
}

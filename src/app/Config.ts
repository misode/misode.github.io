import config from '../config.json'
import type { VersionId } from './services/Versions.js'

export interface ConfigLanguage {
	code: string,
	name: string,
	mc: string,
}

export interface ConfigVersion {
	id: VersionId,
	pack_format: number,
	name: string,
	ref?: string,
	show?: boolean,
	dynamic?: boolean,
}

export interface ConfigGenerator {
	id: string,
	url: string,
	path?: string,
	ext?: string,
	noPath?: boolean,
	tags?: string[],
	aliases?: string[],
	dependency?: string,
	minVersion?: string,
	maxVersion?: string,
	wiki?: string,
}

export interface ConfigLegacyGuide {
	id: string,
	title: string,
	link: string,
}

export interface Config {
	languages: ConfigLanguage[],
	versions: ConfigVersion[],
	generators: ConfigGenerator[],
	legacyGuides: ConfigLegacyGuide[],
}

export default config as Config

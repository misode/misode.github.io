import config from '../config.json'

export interface ConfigLanguage {
	code: string,
	name: string,
	schemas?: boolean,
}

export interface ConfigVersion {
	id: string,
	pack_format: number,
	ref?: string,
	dynamic?: boolean,
}

export interface ConfigGenerator {
	id: string,
	url: string,
	schema: string,
	path?: string,
	noPath?: boolean,
	tags?: string[],
	partner?: string,
	minVersion?: string,
	maxVersion?: string,
}

export interface Config {
	languages: ConfigLanguage[],
	versions: ConfigVersion[],
	generators: ConfigGenerator[],
}

export default config as Config

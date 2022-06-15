import config from '../config.json'

interface Config {
	languages: Array<{
		code: string,
		name: string,
		schemas?: boolean,
	}>,
	versions: Array<{
		id: string,
		pack_format: number,
		ref?: string,
		dynamic?: boolean,
	}>,
	generators: Array<{
		id: string,
		url: string,
		schema: string,
		path?: string,
		category?: string,
		partner?: string,
		minVersion?: string,
		maxVersion?: string,
	}>,
}

export default config as Config

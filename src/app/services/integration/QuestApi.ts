import {Configuration, querystring} from './gen/index.js'

export interface QuestRoot {
	id: string,
	label: string,
	path: string,
	live: boolean,
}

export interface QuestSaveResult {
	saved: boolean,
	reloaded: boolean,
	root: string,
	id: string,
}

export class QuestApi {
	constructor(private readonly configuration: Configuration) {}

	async roots(): Promise<QuestRoot[]> {
		return await this.get('/api/quests/roots') as QuestRoot[]
	}

	async list(root: string): Promise<string[]> {
		return await this.get('/api/quests', { root }) as string[]
	}

	async file(root: string, id: string): Promise<object> {
		return await this.get('/api/quests/file', { root, id }) as object
	}

	async save(root: string, id: string, body: object): Promise<QuestSaveResult> {
		return await this.request('/api/quests/file', {
			method: 'PUT',
			query: { root, id },
			body,
		}) as QuestSaveResult
	}

	private async get(path: string, query?: Record<string, string>): Promise<unknown> {
		return await this.request(path, { method: 'GET', query })
	}

	private async request(path: string, options: { method: string, query?: Record<string, string>, body?: object }): Promise<unknown> {
		const url = new URL(`${this.configuration.basePath}${path}`)
		if (options.query && Object.keys(options.query).length > 0) {
			url.search = querystring(options.query)
		}
		const headers: Record<string, string> = {
			...(this.configuration.headers ?? {}),
		}
		if (options.body !== undefined) {
			headers['Content-Type'] = 'application/json'
		}

		const response = await fetch(url.toString(), {
			method: options.method,
			headers,
			body: options.body === undefined ? undefined : JSON.stringify(options.body),
		})
		if (!response.ok) {
			const text = await response.text()
			throw new Error(text || `Quest API returned ${response.status}`)
		}
		return await response.json()
	}
}

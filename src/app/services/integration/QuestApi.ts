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
			headers['Content-Type'] = 'application/json; charset=utf-8'
		}

		let response: Response
		try {
			response = await fetch(url.toString(), {
				method: options.method,
				headers,
				body: options.body === undefined ? undefined : JSON.stringify(options.body),
			})
		} catch (error) {
			throw new Error(formatQuestNetworkError(error))
		}
		if (!response.ok) {
			const text = await response.text()
			throw new Error(formatQuestApiError(response.status, text))
		}
		return await response.json()
	}
}

function formatQuestApiError(status: number, body: string): string {
	const message = extractErrorMessage(body) || `Quest API returned HTTP ${status}`
	const hint = errorHint(status, message)
	return hint ? `${message}\n\n${hint}` : message
}

function extractErrorMessage(body: string): string | undefined {
	const trimmed = body.trim()
	if (!trimmed) {
		return undefined
	}
	try {
		const json = JSON.parse(trimmed) as { message?: unknown, error?: unknown }
		const message = typeof json.message === 'string' ? json.message : json.error
		if (typeof message === 'string' && message.trim()) {
			return message.trim()
		}
	} catch {
		// Fall through to HTML/plain text handling.
	}

	const htmlMessage = trimmed.match(/<p><b>Message<\/b>\s*([^<]+)<\/p>/i)?.[1]
	if (htmlMessage) {
		return decodeHtml(htmlMessage).trim()
	}
	const title = trimmed.match(/<title>([^<]+)<\/title>/i)?.[1]
	if (title) {
		return decodeHtml(title).trim()
	}
	return trimmed.length > 500 ? `${trimmed.slice(0, 500)}...` : trimmed
}

function errorHint(status: number, message: string): string | undefined {
	const normalized = message.toLowerCase()
	if (status === 0 || normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
		return 'Проверь, что Minecraft-сервер с web API запущен, фронт смотрит на http://localhost:8080, а CORS разрешает адрес фронта.'
	}
	if (status === 401 || status === 403 || normalized.includes('authorization')) {
		return 'Проверь quest API token: введи ровно web.dialog.token из config.yml, без Bearer и без пробелов.'
	}
	if (normalized.includes('token not configured')) {
		return 'В config.yml должен быть задан web.dialog.token. После изменения конфига перезапусти сервер.'
	}
	if (normalized.includes('unknown quest root')) {
		return 'Выбери существующий Root в окне Save to server. Обычно нужен Live plugin data (live).'
	}
	if (normalized.includes('invalid quest id') || normalized.includes('must contain a string id')) {
		return 'Заполни Id простым путём квеста, например story/civ/quest0 или daily/rat_cleanup. Без .., обратных слешей и пустых сегментов.'
	}
	if (normalized.includes('does not match requested id')) {
		return 'Id внутри JSON должен совпадать с именем/путём файла, который сохраняешь. Исправь поле Id или выбери правильный файл.'
	}
	if (normalized.includes('invalid quest json')) {
		return 'JSON не прошёл разбор или проверку. Проверь красные поля в форме и правую панель JSON: типы goal, обязательные поля, числа amount/radius и пустые строки.'
	}
	if (normalized.includes('quest must contain at least one stage')) {
		return 'Добавь хотя бы одну Stage через кнопку Stages +.'
	}
	if (normalized.includes('must contain at least one goal')) {
		return 'В каждой Stage должна быть хотя бы одна цель. Открой Stages -> Goals и добавь goal.'
	}
	if (normalized.includes('goal ids must be unique')) {
		return 'У целей повторяются id. Оставь id пустым для автогенерации или задай каждому goal уникальный id.'
	}
	if (normalized.includes('coordinates')) {
		return 'Заполни координаты объектом: world, x, y, z. Например { "world": "world", "x": 20, "y": 100, "z": 0 }.'
	}
	if (normalized.includes('requires block or blocks')) {
		return 'Для interact_block укажи block для одной точки или blocks для списка точек.'
	}
	if (normalized.includes('entity_type') || normalized.includes('mythic_mob')) {
		return 'Для kill/interact_entity укажи entity_type или mythic_mob, в зависимости от типа цели.'
	}
	if (normalized.includes('radius must be positive') || normalized.includes('radius must be greater than zero')) {
		return 'Radius должен быть числом больше 0.'
	}
	if (normalized.includes('must be greater than zero')) {
		return 'Количество/значение должно быть числом больше 0.'
	}
	if (normalized.includes('unknown arcblood item')) {
		return 'Item id не найден в реестре ArcBlood items. Проверь id предмета или сначала зарегистрируй предмет.'
	}
	if (normalized.includes('unknown arcblood potion')) {
		return 'Potion id не найден в реестре ArcBlood potions. Проверь id зелья или сначала зарегистрируй зелье.'
	}
	if (normalized.includes('resource pack lang files were not found')) {
		return 'Сервер не нашёл lang-файлы ресурспака. Проверь, что папка resourcepack есть в репозитории, и сервер запущен из правильного проекта.'
	}
	if (normalized.includes('quest file was saved, but live reload failed')) {
		return 'Файл сохранился, но live reload квестов упал. Посмотри лог сервера: чаще всего причина в невалидной ссылке на goal/dialog/item.'
	}
	if (normalized.includes('already defines a field named type')) {
		return 'На сервере старая сборка с ошибкой сериализации goal.type. Пересобери plugin и перезапусти сервер.'
	}
	return undefined
}

function formatQuestNetworkError(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error)
	const hint = errorHint(0, message)
	return hint ? `Quest API недоступен: ${message}\n\n${hint}` : `Quest API недоступен: ${message}`
}

function decodeHtml(value: string): string {
	const textarea = document.createElement('textarea')
	textarea.innerHTML = value
	return textarea.value
}

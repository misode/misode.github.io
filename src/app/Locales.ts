import config from '../config.json'
import English from '../locales/en.json'

export type Localize = (key: string, ...params: string[]) => string

interface Locale {
	[key: string]: string
}

export const Locales: {
	[key: string]: Locale,
} = {
	fallback: English,
}

function resolveLocaleParams(value: string, params?: string[]): string {
	return value.replace(/%\d+%/g, match => {
		const index = parseInt(match.slice(1, -1))
		return params?.[index] !== undefined ? params[index] : match
	})
}

export function locale(language: string, key: string, ...params: string[]): string {
	const value: string | undefined = Locales[language]?.[key]
		?? Locales.en?.[key] ?? Locales.fallback[key] ?? key
	return resolveLocaleParams(value, params)
}

export async function loadLocale(language: string) {
	const langConfig = config.languages.find(lang => lang.code === language)
	if (!langConfig) return
	const data = await import(`../locales/${language}.json`)
	const schema = langConfig.schemas !== false
		&& await import(`../../node_modules/@mcschema/locales/src/${language}.json`)
	Locales[language] = { ...data.default, ...schema.default }
}

import type { VersionId } from './Schemas'
import { VersionIds } from './Schemas'

export namespace Store {
	export const ID_LANGUAGE = 'language'
	export const ID_THEME = 'theme'
	export const ID_VERSION = 'schema_version'

	export function getLanguage() {
		return localStorage.getItem(ID_LANGUAGE) ?? 'en'
	}

	export function getTheme() {
		return localStorage.getItem(ID_THEME) ?? 'dark'
	}

	export function getVersion(): VersionId {
		const version = localStorage.getItem(ID_VERSION)
		if (version && VersionIds.includes(version as VersionId)) {
			return version as VersionId
		}
		return '1.17'
	}

	export function setLanguage(language: string | undefined) {
		if (language) localStorage.setItem(ID_LANGUAGE, language)
	}

	export function setTheme(theme: string | undefined) {
		if (theme) localStorage.setItem(ID_THEME, theme)
	}

	export function setVersion(version: VersionId | undefined) {
		if (version) localStorage.setItem(ID_VERSION, version)
	}
}

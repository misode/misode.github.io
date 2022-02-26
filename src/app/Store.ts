import type { Project } from './contexts'
import { DRAFT_PROJECT } from './contexts'
import type { VersionId } from './services'
import { VersionIds } from './services'

export namespace Store {
	export const ID_LANGUAGE = 'language'
	export const ID_THEME = 'theme'
	export const ID_VERSION = 'schema_version'
	export const ID_INDENT = 'indentation'
	export const ID_FORMAT = 'output_format'
	export const ID_HIGHLIGHTING = 'output_highlighting'
	export const ID_SOUNDS_VERSION = 'minecraft_sounds_version'
	export const ID_PROJECTS = 'misode_projects'

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
		if (version === 'latest') return '1.18.2' // Upgrade path, remove in the future
		return '1.18'
	}

	export function getIndent() {
		return localStorage.getItem(ID_INDENT) ?? '2_spaces'
	}

	export function getFormat() {
		return localStorage.getItem(ID_FORMAT) ?? 'json'
	}

	export function getHighlighting() {
		return localStorage.getItem(ID_HIGHLIGHTING) !== 'false'
	}

	export function getSoundsVersion() {
		return localStorage.getItem(ID_SOUNDS_VERSION) ?? 'latest'
	}

	export function getProjects(): Project[] {
		const projects = localStorage.getItem(ID_PROJECTS)
		if (projects) {
			return JSON.parse(projects) as Project[]
		}
		return [DRAFT_PROJECT]
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

	export function setIndent(indent: string | undefined) {
		if (indent) localStorage.setItem(ID_INDENT, indent)
	}

	export function setFormat(format: string | undefined) {
		if (format) localStorage.setItem(ID_FORMAT, format)
	}

	export function setHighlighting(highlighting: boolean | undefined) {
		if (highlighting !== undefined) localStorage.setItem(ID_HIGHLIGHTING, highlighting.toString())
	}

	export function setSoundsVersion(version: string | undefined) {
		if (version) localStorage.setItem(ID_SOUNDS_VERSION, version)
	}

	export function setProjects(projects: Project[] | undefined) {
		if (projects) localStorage.setItem(ID_PROJECTS, JSON.stringify(projects))
	}
}

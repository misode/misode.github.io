import type { Project } from './contexts/index.js'
import { DRAFT_PROJECT } from './contexts/index.js'
import type { VersionId } from './services/index.js'
import { VersionIds } from './services/index.js'

export namespace Store {
	export const ID_LANGUAGE = 'language'
	export const ID_THEME = 'theme'
	export const ID_VERSION = 'schema_version'
	export const ID_INDENT = 'indentation'
	export const ID_FORMAT = 'output_format'
	export const ID_HIGHLIGHTING = 'output_highlighting'
	export const ID_SOUNDS_VERSION = 'minecraft_sounds_version'
	export const ID_PROJECTS = 'misode_projects'
	export const ID_BACKUPS = 'misode_generator_backups'
	export const ID_PROJECT_PANEL_OPEN = 'misode_project_panel_open'
	export const ID_OPEN_PROJECT = 'misode_open_project'
	export const ID_TREE_VIEW_MODE = 'misode_tree_view_mode'
	export const ID_GENERATOR_HISTORY = 'misode_generator_history'

	export function getLanguage() {
		return localStorage.getItem(ID_LANGUAGE) ?? 'en'
	}

	export function getTheme() {
		return localStorage.getItem(ID_THEME) ?? 'dark'
	}

	export function getVersionOrDefault(): VersionId {
		const version = localStorage.getItem(ID_VERSION)
		if (version && VersionIds.includes(version as VersionId)) {
			return version as VersionId
		}
		return '1.19'
	}

	export function getVersion(): VersionId | null {
		const version = localStorage.getItem(ID_VERSION)
		if (version && VersionIds.includes(version as VersionId)) {
			return version as VersionId
		}
		return null
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

	export function getBackup(id: string): object | undefined {
		const backups = JSON.parse(localStorage.getItem(ID_BACKUPS) ?? '{}')
		return backups[id]
	}

	export function getProjectPanelOpen(): boolean | undefined {
		const open = localStorage.getItem(ID_PROJECT_PANEL_OPEN)
		if (open === null) return undefined
		return JSON.parse(open)
	}

	export function getOpenProject() {
		return localStorage.getItem(ID_OPEN_PROJECT) ?? DRAFT_PROJECT.name
	}

	export function getTreeViewMode() {
		return localStorage.getItem(ID_TREE_VIEW_MODE) ?? 'resources'
	}

	export function getGeneratorHistory(): string[] {
		return JSON.parse(localStorage.getItem(ID_GENERATOR_HISTORY) ?? '[]')
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

	export function setBackup(id: string, data: object | undefined) {
		const backups = JSON.parse(localStorage.getItem(ID_BACKUPS) ?? '{}')
		if (data === undefined) {
			delete backups[id]
		} else {
			backups[id] = data
		}
		localStorage.setItem(ID_BACKUPS, JSON.stringify(backups))
	}

	export function setProjectPanelOpen(open: boolean | undefined) {
		if (open === undefined) {
			localStorage.removeItem(ID_PROJECT_PANEL_OPEN)
		} else {
			localStorage.setItem(ID_PROJECT_PANEL_OPEN, JSON.stringify(open))
		}
	}

	export function setOpenProject(projectName: string | undefined) {
		if (projectName === undefined) {
			localStorage.removeItem(ID_OPEN_PROJECT)
		} else {
			localStorage.setItem(ID_OPEN_PROJECT, projectName)
		}
	}

	export function setTreeViewMode(mode: string | undefined) {
		if (mode) localStorage.setItem(ID_TREE_VIEW_MODE, mode)
	}

	export function visitGenerator(id: string) {
		const history = getGeneratorHistory()
		history.push(id)
		localStorage.setItem(ID_GENERATOR_HISTORY, JSON.stringify(history.slice(-50)))
	}
}

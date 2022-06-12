import type { VersionId } from './services'

type Method = 'menu' | 'hotkey'

export namespace Analytics {

	/** Universal Analytics */
	const ID_SITE = 'Site'
	const ID_GENERATOR = 'Generator'

	const DIM_THEME = 1
	const DIM_VERSION = 3
	const DIM_LANGUAGE = 4
	const DIM_GENERATOR = 6
	const DIM_PREFERS_COLOR_SCHEME = 7

	function event(category: string, action: string, label?: string) {
		ga('send', 'event', category, action, label)
	}

	function dimension(index: number, value: string) {
		ga('set', `dimension${index}`, value)
	}

	export function pageview(page: string) {
		ga('set', 'page', page)
		ga('send', 'pageview')
	}

	/**
	 * @deprecated
	 */
	export function generatorEvent(action: string, label?: string) {
		event(ID_GENERATOR, action, label)
	}

	function legacyMethod(method: Method) {
		return method === 'menu' ? 'Menu' : 'Hotkey'
	}
	/** END Universal Analytics 4 */

	export function setLocale(locale: string) {
		dimension(DIM_LANGUAGE, locale)
		gtag('set', {
			locale,
		})
	}

	export function changeLocale(prev_locale: string, locale: string) {
		setLocale(locale)
		event(ID_SITE, 'set-language', locale)
		gtag('event', 'change_locale', {
			prev_locale,
		})
	}

	export function setTheme(theme: string) {
		dimension(DIM_THEME, theme)
		gtag('set', {
			theme,
		})
	}

	export function changeTheme(prev_theme: string, theme: string) {
		setTheme(theme)
		event(ID_SITE, 'set-theme', theme)
		gtag('event', 'change_theme', {
			prev_theme,
		})
	}

	export function setVersion(version: string) {
		dimension(DIM_VERSION, version)
		gtag('set', {
			version,
		})
	}

	export function setSelectedVersion(selected_version: string) {
		gtag('set', {
			selected_version,
		})
	}

	export function changeVersion(prev_version: string, version: string) {
		setVersion(version)
		event(ID_GENERATOR, 'set-version', version)
		gtag('event', 'change_version', {
			prev_version,
		})
	}

	export function setGenerator(file_type: string) {
		dimension(DIM_GENERATOR, file_type)
		gtag('event', 'use_generator', {
			file_type,
		})
	}

	export function setPrefersColorScheme(prefers_color_scheme: string) {
		dimension(DIM_PREFERS_COLOR_SCHEME, prefers_color_scheme)
		gtag('set', {
			prefers_color_scheme,
		})
	}

	export function resetGenerator(file_type: string, history: number, method: Method) {
		event(ID_GENERATOR, 'reset')
		gtag('event', 'reset_generator', {
			file_type,
			history,
			method,
		})
	}

	export function undoGenerator(file_type: string, history: number, method: Method) {
		event(ID_GENERATOR, 'undo', legacyMethod(method))
		gtag('event', 'undo_generator', {
			file_type,
			history,
			method,
		})
	}

	export function redoGenerator(file_type: string, history: number, method: Method) {
		event(ID_GENERATOR, 'undo', legacyMethod(method))
		gtag('event', 'redo_generator', {
			file_type,
			history,
			method,
		})
	}

	export function loadPreset(file_type: string, file_name: string) {
		event(ID_GENERATOR, 'load-preset', file_name)
		gtag('event', 'load_generator_preset', {
			file_type,
			file_name,
		})
	}

	export function openPreset(file_type: string, file_name: string) {
		gtag('event', 'open_generator_preset', {
			file_type,
			file_name,
		})
	}

	export function createSnippet(file_type: string, snippet_id: string, version: VersionId, data_size: number, compressed_size: number, compression_rate: number) {
		gtag('event', 'create_generator_snippet', {
			file_type,
			snippet_id,
			version,
			data_size,
			compressed_size,
			compression_rate,
		})
	}

	export function openSnippet(file_type: string, snippet_id: string, version: VersionId) {
		gtag('event', 'open_generator_snippet', {
			file_type,
			snippet_id,
			version,
		})
	}

	export function copyOutput(file_type: string, method: Method) {
		event(ID_GENERATOR, 'copy')
		gtag('event', 'copy_generator_output', {
			file_type,
			method,
		})
	}

	export function downloadOutput(file_type: string, method: Method) {
		event(ID_GENERATOR, 'download')
		gtag('event', 'download_generator_output', {
			file_type,
			method,
		})
	}

	export function showOutput(file_type: string, method: Method) {
		event(ID_GENERATOR, 'toggle-output', 'visible')
		gtag('event', 'show_generator_output', {
			file_type,
			method,
		})
	}

	export function hideOutput(file_type: string, method: Method) {
		event(ID_GENERATOR, 'toggle-output', 'hidden')
		gtag('event', 'hide_generator_output', {
			file_type,
			method,
		})
	}

	export function showPreview(file_type: string, method: Method) {
		event(ID_GENERATOR, 'toggle-preview', 'visible')
		gtag('event', 'show_generator_preview', {
			file_type,
			method,
		})
	}

	export function hidePreview(file_type: string, method: Method) {
		event(ID_GENERATOR, 'toggle-preview', 'hidden')
		gtag('event', 'hide_generator_preview', {
			file_type,
			method,
		})
	}

	export function showProject(file_type: string, projects_count: number, project_size: number, method: Method) {
		event(ID_GENERATOR, 'show-project', legacyMethod(method))
		gtag('event', 'show_project', {
			file_type,
			projects_count,
			project_size,
			method,
		})
	}

	export function hideProject(file_type: string, projects_count: number, project_size: number, method: Method) {
		event(ID_GENERATOR, 'hide-project', legacyMethod(method))
		gtag('event', 'hide_project', {
			file_type,
			projects_count,
			project_size,
			method,
		})
	}

	export function saveProjectFile(file_type: string, projects_count: number, project_size: number, method: Method) {
		event(ID_GENERATOR, 'save-project-file', legacyMethod(method))
		gtag('event', 'save_project_file', {
			file_type,
			projects_count,
			project_size,
			method,
		})
	}

	export function deleteProjectFile(file_type: string, projects_count: number, project_size: number, method: Method) {
		event(ID_GENERATOR, 'delete-project-file', legacyMethod(method))
		gtag('event', 'delete_project_file', {
			file_type,
			projects_count,
			project_size,
			method,
		})
	}

	export function renameProjectFile(file_type: string, projects_count: number, project_size: number, method: Method) {
		event(ID_GENERATOR, 'rename-project-file', legacyMethod(method))
		gtag('event', 'rename_project_file', {
			file_type,
			projects_count,
			project_size,
			method,
		})
	}
}

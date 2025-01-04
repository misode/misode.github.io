import type { ColormapType } from './components/previews/Colormap.js'
import type { VersionId } from './services/index.js'

export type Method = 'menu' | 'hotkey'

export namespace Analytics {
	export function setLocale(locale: string) {
		gtag('set', {
			locale,
		})
	}

	export function changeLocale(prev_locale: string, locale: string) {
		setLocale(locale)
		gtag('event', 'change_locale', {
			prev_locale,
		})
	}

	export function setTheme(theme: string) {
		gtag('set', {
			theme,
		})
	}

	export function changeTheme(prev_theme: string, theme: string) {
		setTheme(theme)
		gtag('event', 'change_theme', {
			prev_theme,
		})
	}

	export function setVersion(version: string) {
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
		gtag('event', 'change_version', {
			prev_version,
		})
	}

	export function setGenerator(file_type: string) {
		gtag('event', 'use_generator', {
			file_type,
		})
	}

	export function setPrefersColorScheme(prefers_color_scheme: string) {
		gtag('set', {
			prefers_color_scheme,
		})
	}

	export function setTreeViewMode(tree_view_mode: string) {
		gtag('set', {
			tree_view_mode,
		})
	}

	export function setColormap(colormap: ColormapType) {
		gtag('set', {
			colormap,
		})
	}

	export function resetGenerator(file_type: string, history: number, method: Method) {
		gtag('event', 'reset_generator', {
			file_type,
			history,
			method,
		})
	}

	export function undoGenerator(file_type: string, history: number, method: Method) {
		gtag('event', 'undo_generator', {
			file_type,
			history,
			method,
		})
	}

	export function redoGenerator(file_type: string, history: number, method: Method) {
		gtag('event', 'redo_generator', {
			file_type,
			history,
			method,
		})
	}

	export function loadPreset(file_type: string, file_name: string) {
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
		gtag('event', 'copy_generator_output', {
			file_type,
			method,
		})
	}

	export function downloadOutput(file_type: string, method: Method) {
		gtag('event', 'download_generator_output', {
			file_type,
			method,
		})
	}

	export function showOutput(file_type: string, method: Method) {
		gtag('event', 'show_generator_output', {
			file_type,
			method,
		})
	}

	export function hideOutput(file_type: string, method: Method) {
		gtag('event', 'hide_generator_output', {
			file_type,
			method,
		})
	}

	export function showPreview(file_type: string, method: Method) {
		gtag('event', 'show_generator_preview', {
			file_type,
			method,
		})
	}

	export function hidePreview(file_type: string, method: Method) {
		gtag('event', 'hide_generator_preview', {
			file_type,
			method,
		})
	}

	export function showProject(method: Method) {
		gtag('event', 'show_project', {
			method,
		})
	}

	export function hideProject(method: Method) {
		gtag('event', 'hide_project', {
			method,
		})
	}

	export function saveProjectFile(method: Method) {
		gtag('event', 'save_project_file', {
			method,
		})
	}

	export function deleteProjectFile(method: Method) {
		gtag('event', 'delete_project_file', {
			method,
		})
	}

	export function renameProjectFile(method: Method) {
		gtag('event', 'rename_project_file', {
			method,
		})
	}

	export function deleteProject(method: Method) {
		gtag('event', 'delete_project', {
			method,
		})
	}
}

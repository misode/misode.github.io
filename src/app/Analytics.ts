export namespace Analytics {
	const ID_SITE = 'Site'
	const ID_GENERATOR = 'Generator'

	const DIM_THEME = 1
	const DIM_VERSION = 3
	const DIM_LANGUAGE = 4
	const DIM_PREVIEW = 5

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

	export function setLanguage(language: string) {
		dimension(DIM_LANGUAGE, language)
		event(ID_SITE, 'set-language', language)
	}

	export function setTheme(theme: string) {
		dimension(DIM_THEME, theme)
		event(ID_SITE, 'set-theme', theme)
	}

	export function setVersion(version: string) {
		dimension(DIM_VERSION, version)
		event(ID_GENERATOR, 'set-version', version)
	}

	export function setPreview(preview: string) {
		dimension(DIM_PREVIEW, preview)
		event(ID_GENERATOR, 'set-preview', preview)
	}

	export function generatorEvent(action: string, label?: string) {
		event(ID_GENERATOR, action, label)
	}
}

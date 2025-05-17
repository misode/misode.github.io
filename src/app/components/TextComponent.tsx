import { useMemo } from 'preact/hooks'
import { useLocale } from '../contexts/Locale.jsx'
import { useVersion } from '../contexts/Version.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { getLanguage, replaceTranslation } from '../services/Resources.js'

interface StyleData {
	color?: string,
	bold?: boolean,
	italic?: boolean,
	underlined?: boolean,
	strikethrough?: boolean,
}

interface PartData extends StyleData {
	text?: string,
	translate?: string,
	fallback?: string,
	with?: string[],
}

interface Props {
	component: unknown,
	base?: StyleData,
	oneline?: boolean,
}
export function TextComponent({ component, base = { color: 'white' }, oneline }: Props) {
	const { version } = useVersion()
	const { lang } = useLocale()

	const state = JSON.stringify(component)
	const parts = useMemo(() => {
		const parts: PartData[] = []
		visitComponent(component, el => parts.push(inherit(el, base)))
		return parts
	}, [state, base])

	const { value: language } = useAsync(() => getLanguage(version, lang), [version, lang])

	return <div class="text-component">
		{parts.map(p => <TextPart part={p} lang={language ?? {}} oneline={oneline} />)}
	</div>
}

function visitComponent(component: unknown, consumer: (c: PartData) => void) {
	if (typeof component === 'string' || typeof component === 'number') {
		consumer({ text: component.toString() })
	} else if (Array.isArray(component)) {
		const base = component[0] ?? {}
		visitComponent(base, consumer)
		for (const c of component.slice(1)) {
			visitComponent(c, d => consumer(inherit(d, base)))
		}
	} else if (typeof component === 'object' && component !== null) {
		if ('text' in component) {
			consumer(component)
		} else if ('translate' in component) {
			consumer(component)
		} else if ('score' in component) {
			consumer({ ...component, text: '123' })
		} else if ('selector' in component) {
			consumer({ ...component, text: 'Steve' })
		} else if ('keybind' in component) {
			consumer({ ...component, text: (component as any).keybind })
		} else if ('nbt' in component) {
			consumer({ ...component, text: (component as any).nbt })
		}
		if ('extra' in component) {
			for (const e of (component as any).extra) {
				visitComponent(e, c => consumer(inherit(c, component)))
			}
		}
	}
}

function inherit(component: any, base: PartData) {
	return {
		...component,
		color: component.color ?? base.color,
		bold: component.bold ?? base.bold,
		italic: component.italic ?? base.italic,
		underlined: component.underlined ?? base.underlined,
		strikethrough: component.strikethrough ?? base.strikethrough,
	}
}

const TextColors: Record<string, [string, string]> = {
	black: ['#000', '#000'],
	dark_blue: ['#00A', '#00002A'],
	dark_green: ['#0A0', '#002A00'],
	dark_aqua: ['#0AA', '#002A2A'],
	dark_red: ['#A00', '#2A0000'],
	dark_purple: ['#A0A', '#2A002A'],
	gold: ['#FA0', '#2A2A00'],
	gray: ['#AAA', '#2A2A2A'],
	dark_gray: ['#555', '#151515'],
	blue: ['#55F', '#15153F'],
	green: ['#5F5', '#153F15'],
	aqua: ['#5FF', '#153F3F'],
	red: ['#F55', '#3F1515'],
	light_purple: ['#F5F', '#3F153F'],
	yellow: ['#FF5', '#3F3F15'],
	white: ['#FFF', '#3F3F3F'],
}

function TextPart({ part, lang, oneline }: { part: PartData, lang: Record<string, string>, oneline?: boolean }) {
	let text = part.translate
		? resolveTranslate(part.translate, part.fallback, part.with, lang)
		: (part.text ?? '')
	text = oneline ? text.replaceAll('\n', '␊') : text
	return <span style={createStyle(part)}>{text}</span>
}

function resolveTranslate(translate: string, fallback: string | undefined, with_: any[] | undefined, lang: Record<string, string>): string {
	const str = lang[translate] ?? fallback ?? translate
	if (typeof str !== 'string') return translate
	const params = with_?.map((c): string => {
		if (typeof c === 'string' || typeof c === 'number') return `${c}`
		if (c.text) return c.text
		if (c.translate) return resolveTranslate(c.translate, c.fallback, c.with, lang)
		return ''
	})
	return replaceTranslation(str, params)
}

function createStyle(style: StyleData) {
	return {
		color: style.color ? (TextColors[style.color]?.[0] ?? style.color) : undefined,
		'--shadow-color': style.color ? TextColors[style.color]?.[1] : undefined,
		fontWeight: (style.bold === true) ? 'bold' : undefined,
		fontStyle: (style.italic === true) ? 'italic' : undefined,
		textDecoration: (style.underlined === true)
			? (style.strikethrough === true) ? 'underline line-through' : 'underline'
			: (style.strikethrough === true) ? 'line-through' : undefined,
	}
}

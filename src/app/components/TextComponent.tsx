import { useMemo } from 'preact/hooks'
import { useVersion } from '../contexts/Version.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { getTranslation } from '../services/Resources.js'

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
	with?: string[],
}

interface Props {
	component: unknown,
	base?: StyleData,
	shadow?: boolean,
}
export function TextComponent({ component, base = { color: 'white' }, shadow = true }: Props) {
	const state = JSON.stringify(component)
	const parts = useMemo(() => {
		const parts: PartData[] = []
		visitComponent(component, el => parts.push(el))
		return parts
	}, [state])

	return <div class="text-component">
		{shadow && <div style={createStyle(base, true)}>
			{parts.map(p => <TextPart part={p} shadow={true} />)}
		</div>}
		<div class="text-foreground" style={createStyle(base, false)}>
			{parts.map(p => <TextPart part={p} />)}
		</div>
	</div>
}

function visitComponent(component: unknown, consumer: (c: PartData) => void) {
	if (typeof component === 'string' || typeof component === 'number') {
		consumer({ text: component.toString() })
	} else if (Array.isArray(component)) {
		const base = component[0]
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

function inherit(component: object, base: PartData) {
	return {
		color: base.color,
		bold: base.bold,
		italic: base.italic,
		underlined: base.underlined,
		strikethrough: base.strikethrough,
		...component,
	}
}

const TextColors = {
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

type TextColorKey = keyof typeof TextColors
const TextColorKeys = Object.keys(TextColors)

function TextPart({ part, shadow }: { part: PartData, shadow?: boolean }) {
	if (part.translate) {
		const { version } = useVersion()
		const { value: translated } = useAsync(() => {
			return getTranslation(version, part.translate!, part.with)
		}, [version, part.translate, ...part.with ?? []])
		return <span style={createStyle(part, shadow)}>{translated ?? part.translate}</span>
	}
	return <span style={createStyle(part, shadow)}>{part.text}</span>
}

function createStyle(style: StyleData, shadow?: boolean) {
	return {
		color: style.color && (TextColorKeys.includes(style.color)
			? TextColors[style.color as TextColorKey][shadow ? 1 : 0]
			: shadow ? 'transparent' : style.color),
		fontWeight: (style.bold === true) ? 'bold' : undefined,
		fontStyle: (style.italic === true) ? 'italic' : undefined,
		textDecoration: (style.underlined === true)
			? (style.strikethrough === true) ? 'underline line-through' : 'underline'
			: (style.strikethrough === true) ? 'line-through' : undefined,
	}
}

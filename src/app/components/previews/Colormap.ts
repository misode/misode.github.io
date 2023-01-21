import { clamp } from '../../Utils.js'
import colormaps from './colormaps.json'

// Implementation based on https://github.com/politiken-journalism/scale-color-perceptual/blob/master/utils/interpolate.js
// Licenced as ISC
// Copyright (c) 2015, Politiken Journalism <emil.bay@pol.dk>

export const ColormapTypes = ['viridis', 'inferno', 'magma', 'plasma', 'cividis', 'rocket', 'mako', 'turbo', 'gray'] as const
export type ColormapType = typeof ColormapTypes[number]

type Color = [number, number, number]

function createColormap(type: ColormapType) {
	if (type === 'gray') {
		return (t: number) => [t, t, t]
	}
	const colors = colormaps[type]
	const n = colors.length - 2
	const w = 1 / n
	const intervals: Array<(t: number) => Color> = []
	for (var i = 0; i <= n; i++) {
		const a = colors[i]
		const b = colors[i+1]
		const ar = a[0]
		const ag = a[1]
		const ab = a[2]
		const br = b[0] - ar
		const bg = b[1] - ag
		const bb = b[2] - ab
		intervals[i] = (t: number) => [
			ar + br * t,
			ag + bg * t,
			ab + bb * t,
		]
	}
	return (t: number) => {
		t = clamp(t, 0, 1)
		const i = Math.floor(t * n)
		var offs = i * w
		return intervals[i](t / w - offs / w)
	}
}

const Colormaps = new Map(ColormapTypes.map(type => {
	return [type, createColormap(type)]
}))

export function getColormap(type: ColormapType) {
	return Colormaps.get(type)!
}

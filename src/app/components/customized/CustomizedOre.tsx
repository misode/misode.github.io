import { useCallback } from 'preact/hooks'
import type { CustomizedModel, CustomizedOreModel } from './CustomizedModel.js'
import { CustomizedSlider } from './CustomizedSlider.jsx'

interface Props {
	model: CustomizedModel,
	value: CustomizedOreModel,
	initial: CustomizedOreModel,
	onChange: (value: CustomizedOreModel) => void,
}
export function CustomizedOre({ model, value, initial, onChange }: Props) {
	const changeOre = useCallback((change: Partial<CustomizedOreModel>) => {
		onChange({ ...value, ...change })
	}, [value])

	return <>
		<CustomizedSlider label="Size" help="The size of the ore vein, does not directly correspond with number of blocks" value={value.size} onChange={v => changeOre({ size: v })} min={1} max={64} initial={initial.size} />
		{Number.isInteger(value.tries)
			? <CustomizedSlider label="Tries" help="The number of attempts to generate an ore vein per chunk"
				value={value.tries} onChange={v => changeOre({ tries: v })}
				min={1} max={100} initial={initial.tries}/>
			: <CustomizedSlider label="Rarity" help="The chance to generate an ore vein per chunk, larger values make them rarer"
				value={Math.round(1 / value.tries)} onChange={v => changeOre({ tries: 1 / v })}
				min={1} max={100} initial={Math.round(1 / initial.tries)} />}
		<CustomizedSlider label={value.trapezoid ? 'Min triangle' : 'Min height'} help="The lowest Y level the ore vein can generate at"
			value={calcHeight(model, value.minAboveBottom, value.minBelowTop, value.minHeight) ?? 0}
			onChange={v => changeOre(value.minAboveBottom !== undefined ? { minAboveBottom: v - model.minHeight } : value.minBelowTop != undefined ? { minBelowTop: model.maxHeight - v } : { minHeight: v })}
			min={-64} max={320} initial={calcHeight(model, initial.minAboveBottom, initial.minBelowTop, initial.minHeight) ?? 0} />
		<CustomizedSlider label={value.trapezoid ? 'Max triangle' : 'Max height'} help="The highest Y level the ore vein can generate at"
			value={calcHeight(model, value.maxAboveBottom, value.maxBelowTop, value.maxHeight) ?? 0}
			onChange={v => changeOre(value.maxAboveBottom !== undefined ? { maxAboveBottom: v - model.minHeight } : value.maxBelowTop != undefined ? { maxBelowTop: model.maxHeight - v } : { maxHeight: v })}
			min={-64} max={320} initial={calcHeight(model, initial.maxAboveBottom, initial.maxBelowTop, initial.maxHeight) ?? 0} />
	</>
}

function calcHeight(model: CustomizedModel, aboveBottom: number | undefined, belowTop: number | undefined, absolute: number | undefined) {
	return aboveBottom !== undefined
		? (model.minHeight + aboveBottom)
		: belowTop !== undefined
			? (model.maxHeight - belowTop)
			: absolute
}

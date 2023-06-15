import { Identifier, ItemStack } from 'deepslate'
import { ItemDisplay } from '../ItemDisplay.jsx'
import { TextInput } from '../index.js'
import { CustomizedInput } from './CustomizedInput.jsx'
import type { CustomizedModel } from './CustomizedModel.js'
import { DefaultModel } from './CustomizedModel.js'
import { CustomizedSlider } from './CustomizedSlider.jsx'
import { CustomizedToggle } from './CustomizedToggle.jsx'

interface Props {
	model: CustomizedModel,
	changeModel: (model: Partial<CustomizedModel>) => void,
}
export function BasicSettings({ model, changeModel }: Props) {
	return <>
		<CustomizedSlider label="Min height"
			value={model.minHeight} onChange={v => changeModel({ minHeight: v })}
			min={-128} max={384} step={16} initial={DefaultModel.minHeight}
			error={model.minHeight % 16 !== 0 ? 'Min height needs to be a multiple of 16' : undefined} />
		<CustomizedSlider label="Max height"
			value={model.maxHeight} onChange={v => changeModel({ maxHeight: v })}
			min={-128} max={384} step={16} initial={DefaultModel.maxHeight}
			error={model.maxHeight <= model.minHeight ? 'Max height needs to be larger than Min height' : model.maxHeight % 16 !== 0 ? 'Max height needs to be a multiple of 16' : undefined} />
		<CustomizedSlider label="Sea level"
			value={model.seaLevel} onChange={v => changeModel({ seaLevel: v })}
			min={-128} max={384} initial={DefaultModel.seaLevel} />
		<CustomizedInput label="Oceans"
			value={model.oceans} onChange={v => changeModel({ oceans: v })}
			initial={DefaultModel.oceans}>
			<button class={`customized-toggle${model.oceans === 'water' ? ' customized-water' : ''}`} onClick={() => changeModel({ oceans: 'water' })}>Water</button>
			<span>/</span>
			<button class={`customized-toggle${model.oceans === 'lava' ? ' customized-lava' : ''}`} onClick={() => changeModel({ oceans: 'lava' })}>Lava</button>
			<span>/</span>
			<button class={`customized-toggle${model.oceans != 'water' && model.oceans != 'lava' ? ' customized-active' : ''}`} onClick={() => changeModel({ oceans: 'slime_block' })}>Custom</button>
			{model.oceans != 'water' && model.oceans != 'lava' && <>
				<TextInput value={model.oceans} onChange={v => changeModel({ oceans: v })} />
				<ItemDisplay item={new ItemStack(Identifier.parse(model.oceans), 1)} tooltip={false} />
			</>}
		</CustomizedInput>
		<div class="customized-group">
			<CustomizedToggle label="Caves"
				value={model.caves} onChange={v => changeModel({ caves: v })}
				initial={DefaultModel.caves} />
			{model.caves && <div class="customized-childs">
				<CustomizedToggle label="Noise caves"
					value={model.noiseCaves} onChange={v => changeModel({ noiseCaves: v })}
					initial={DefaultModel.noiseCaves} />
				<CustomizedToggle label="Carver caves"
					value={model.carverCaves} onChange={v => changeModel({ carverCaves: v })}
					initial={DefaultModel.carverCaves} />
				<CustomizedToggle label="Ravines"
					value={model.ravines} onChange={v => changeModel({ ravines: v })}
					initial={DefaultModel.ravines} />
			</div>}
		</div>
		<CustomizedSlider label="Biome size"
			value={model.biomeSize} onChange={v => changeModel({ biomeSize: v })}
			min={1} max={8} initial={DefaultModel.biomeSize} />
	</>
}

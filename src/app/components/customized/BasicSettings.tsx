import { Identifier, ItemStack } from 'deepslate'
import { ItemDisplay } from '../ItemDisplay.jsx'
import { TextInput } from '../index.js'
import { CustomizedInput } from './CustomizedInput.jsx'
import type { CustomizedModel } from './CustomizedModel.js'
import { CustomizedSlider } from './CustomizedSlider.jsx'
import { CustomizedToggle } from './CustomizedToggle.jsx'

interface Props {
	model: CustomizedModel,
	initialModel: CustomizedModel,
	changeModel: (model: Partial<CustomizedModel>) => void,
}
export function BasicSettings({ model, initialModel, changeModel }: Props) {
	return <>
		<CustomizedSlider label="Min height" help="The lowest Y level of the world"
			value={model.minHeight} onChange={v => changeModel({ minHeight: v })}
			min={-128} max={384} step={16} initial={initialModel.minHeight}
			error={model.minHeight % 16 !== 0 ? 'Min height needs to be a multiple of 16' : undefined} />
		<CustomizedSlider label="Max height" help="The highest Y level of the world"
			value={model.maxHeight} onChange={v => changeModel({ maxHeight: v })}
			min={-128} max={384} step={16} initial={initialModel.maxHeight}
			error={model.maxHeight <= model.minHeight ? 'Max height needs to be larger than Min height' : model.maxHeight % 16 !== 0 ? 'Max height needs to be a multiple of 16' : undefined} />
		<CustomizedSlider label="Sea level" help="The top Y level of the oceans"
			value={model.seaLevel} onChange={v => changeModel({ seaLevel: v })}
			min={-128} max={384} initial={initialModel.seaLevel} />
		<CustomizedInput label="Oceans" help="The block used to fill the oceans"
			value={model.oceans} onChange={v => changeModel({ oceans: v })}
			initial={initialModel.oceans}>
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
			<CustomizedToggle label="Caves" help="Whether caves will generate"
				value={model.caves} onChange={v => changeModel({ caves: v })}
				initial={initialModel.caves} />
			{model.caves && <div class="customized-childs">
				<CustomizedToggle label="Noise caves" help="The new caves introduced in 1.18"
					value={model.noiseCaves} onChange={v => changeModel({ noiseCaves: v })}
					initial={initialModel.noiseCaves} />
				<CustomizedToggle label="Old caves" help="The legacy caves"
					value={model.carverCaves} onChange={v => changeModel({ carverCaves: v })}
					initial={initialModel.carverCaves} />
				<CustomizedToggle label="Ravines" help="The legacy ravines and canyons"
					value={model.ravines} onChange={v => changeModel({ ravines: v })}
					initial={initialModel.ravines} />
			</div>}
		</div>
		<CustomizedSlider label="Biome size" help="The scale of the biome layout, 6 corresponds to the large biomes preset"
			value={model.biomeSize} onChange={v => changeModel({ biomeSize: v })}
			min={1} max={8} initial={initialModel.biomeSize} />
	</>
}

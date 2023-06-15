import { Identifier, ItemStack } from 'deepslate'
import { deepClone } from '../../Utils.js'
import { ItemDisplay } from '../ItemDisplay.jsx'
import { CustomizedInput } from './CustomizedInput.jsx'
import type { CustomizedModel, CustomizedOreModel } from './CustomizedModel.js'
import { DefaultModel } from './CustomizedModel.js'
import { CustomizedOre } from './CustomizedOre.jsx'

interface Props {
	label: string,
	item?: string,
	ores: (keyof CustomizedModel)[],
	model: CustomizedModel,
	changeModel: (model: Partial<CustomizedModel>) => void,
}
export function CustomizedOreGroup({ label, item, ores, model, changeModel }: Props) {
	const isEnabled = ores.every(k => model[k] != undefined)

	return <div class="customized-group">
		<CustomizedInput label={<>
			{item != undefined && <ItemDisplay item={new ItemStack(Identifier.parse(item), 1)} tooltip={false} />}
			<label>{label}</label>
		</>} value={ores.map(k => model[k])} initial={ores.map(k => DefaultModel[k])} onChange={() => changeModel(ores.reduce((acc, k) => ({ ...acc, [k]: deepClone(DefaultModel[k])}), {}))}>
			<button class={`customized-toggle${!isEnabled ? ' customized-false' : ''}`} onClick={() => changeModel(ores.reduce((acc, k) => ({ ...acc, [k]: undefined}), {}))}>No</button>
			<span>/</span>
			<button class={`customized-toggle${isEnabled ? ' customized-true' : ''}`} onClick={() => isEnabled || changeModel(ores.reduce((acc, k) => ({ ...acc, [k]: deepClone(DefaultModel[k])}), {}))}>Yes</button>
		</CustomizedInput>
		{isEnabled && ores.map(k => <div key={k} class="customized-childs">
			<CustomizedOre model={model} value={model[k] as CustomizedOreModel} onChange={v => changeModel({ [k]: v })} initial={DefaultModel[k] as CustomizedOreModel} />
		</div>)}
	</div>
}

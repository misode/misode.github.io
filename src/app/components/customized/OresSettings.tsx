import type { CustomizedModel } from './CustomizedModel.js'
import { CustomizedOreGroup } from './CustomizedOreGroup.jsx'

interface Props {
	model: CustomizedModel,
	changeModel: (model: Partial<CustomizedModel>) => void,
}
export function OresSettings({ model, changeModel }: Props) {
	return <>
		<CustomizedOreGroup label="Dirt" item="dirt" ores={['dirt']} {...{model, changeModel}} />
		<CustomizedOreGroup label="Gravel" item="gravel" ores={['gravel']} {...{model, changeModel}} />
		<CustomizedOreGroup label="Granite" item="granite" ores={['graniteLower', 'graniteUpper']} {...{model, changeModel}} />
		<CustomizedOreGroup label="Diorite" item="diorite" ores={['dioriteLower', 'dioriteUpper']} {...{model, changeModel}} />
		<CustomizedOreGroup label="Andesite" item="andesite" ores={['andesiteLower', 'andesiteUpper']} {...{model, changeModel}} />
		<CustomizedOreGroup label="Coal" item="coal_ore" ores={['coalLower', 'coalUpper']} {...{model, changeModel}} />
		<CustomizedOreGroup label="Iron" item="iron_ore" ores={['ironSmall', 'ironMiddle', 'ironUpper']} {...{model, changeModel}} />
		<CustomizedOreGroup label="Copper" item="copper_ore" ores={['copper', 'copperLarge']} {...{model, changeModel}} />
		<CustomizedOreGroup label="Gold" item="gold_ore" ores={['goldLower', 'gold']} {...{model, changeModel}} />
		<CustomizedOreGroup label="Redstone" item="redstone_ore" ores={['redstoneLower', 'redstone']} {...{model, changeModel}} />
		<CustomizedOreGroup label="Lapis Lazuli" item="lapis_ore" ores={['lapis', 'lapisBuried']} {...{model, changeModel}} />
		<CustomizedOreGroup label="Diamond" item="diamond_ore" ores={['diamond', 'diamondBuried', 'diamondLarge']} {...{model, changeModel}} />
	</>
}

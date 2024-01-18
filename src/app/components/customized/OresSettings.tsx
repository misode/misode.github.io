import type { CustomizedModel } from './CustomizedModel.js'
import { CustomizedOreGroup } from './CustomizedOreGroup.jsx'

interface Props {
	model: CustomizedModel,
	initialModel: CustomizedModel,
	changeModel: (model: Partial<CustomizedModel>) => void,
}
export function OresSettings(props: Props) {
	return <>
		<CustomizedOreGroup label="Dirt" item="dirt" ores={['dirt']} {...props} />
		<CustomizedOreGroup label="Gravel" item="gravel" ores={['gravel']} {...props} />
		<CustomizedOreGroup label="Granite" item="granite" ores={['graniteLower', 'graniteUpper']} {...props} />
		<CustomizedOreGroup label="Diorite" item="diorite" ores={['dioriteLower', 'dioriteUpper']} {...props} />
		<CustomizedOreGroup label="Andesite" item="andesite" ores={['andesiteLower', 'andesiteUpper']} {...props} />
		<CustomizedOreGroup label="Coal" item="coal_ore" ores={['coalLower', 'coalUpper']} {...props} />
		<CustomizedOreGroup label="Iron" item="iron_ore" ores={['ironSmall', 'ironMiddle', 'ironUpper']} {...props} />
		<CustomizedOreGroup label="Copper" item="copper_ore" ores={['copper', 'copperLarge']} {...props} />
		<CustomizedOreGroup label="Gold" item="gold_ore" ores={['goldLower', 'gold']} {...props} />
		<CustomizedOreGroup label="Redstone" item="redstone_ore" ores={['redstoneLower', 'redstone']} {...props} />
		<CustomizedOreGroup label="Lapis Lazuli" item="lapis_ore" ores={['lapis', 'lapisBuried']} {...props} />
		<CustomizedOreGroup label="Emerald" item="emerald_ore" ores={['emerald']} {...props} />
		<CustomizedOreGroup label="Diamond" item="diamond_ore" ores={['diamond', 'diamondBuried', 'diamondLarge']} {...props} />
	</>
}

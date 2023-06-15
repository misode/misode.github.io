import type { CustomizedModel } from './CustomizedModel.js'
import { DefaultModel } from './CustomizedModel.js'
import { CustomizedSlider } from './CustomizedSlider.jsx'
import { CustomizedToggle } from './CustomizedToggle.jsx'

interface Props {
	model: CustomizedModel,
	changeModel: (model: Partial<CustomizedModel>) => void,
}
export function StructuresSettings({ model, changeModel }: Props) {
	return <>
		<CustomizedToggle label="Strongholds"
			value={model.strongholds} onChange={v => changeModel({ strongholds: v })}
			initial={DefaultModel.strongholds} />
		<CustomizedToggle label="Villages"
			value={model.villages} onChange={v => changeModel({ villages: v })}
			initial={DefaultModel.villages} />
		<CustomizedToggle label="Mineshafts"
			value={model.mineshafts} onChange={v => changeModel({ mineshafts: v })}
			initial={DefaultModel.mineshafts} />
		<CustomizedToggle label="Desert pyramids"
			value={model.desertPyramids} onChange={v => changeModel({ desertPyramids: v })}
			initial={DefaultModel.desertPyramids} />
		<CustomizedToggle label="Jungle temples"
			value={model.jungleTemples} onChange={v => changeModel({ jungleTemples: v })}
			initial={DefaultModel.jungleTemples} />
		<CustomizedToggle label="Witch huts"
			value={model.witchHuts} onChange={v => changeModel({ witchHuts: v })}
			initial={DefaultModel.witchHuts} />
		<CustomizedToggle label="Igloos"
			value={model.igloos} onChange={v => changeModel({ igloos: v })}
			initial={DefaultModel.igloos} />
		<CustomizedToggle label="Ocean monuments"
			value={model.oceanMonuments} onChange={v => changeModel({ oceanMonuments: v })}
			initial={DefaultModel.oceanMonuments} />
		<CustomizedToggle label="Dungeons"
			value={model.dungeons} onChange={v => changeModel({ dungeons: v })}
			initial={DefaultModel.dungeons}>
			{model.dungeons && <CustomizedSlider label="Tries"
				value={model.dungeonTries} onChange={v => changeModel({ dungeonTries: v })}
				min={1} max={100} initial={DefaultModel.dungeonTries} />}
		</CustomizedToggle>
		<CustomizedToggle label="Water lakes"
			value={model.waterLakes} onChange={v => changeModel({ waterLakes: v })}
			initial={DefaultModel.waterLakes}>
			{model.waterLakes && <CustomizedSlider label="Rarity"
				value={model.waterLakeRarity} onChange={v => changeModel({ waterLakeRarity: v })}
				min={1} max={100} initial={DefaultModel.waterLakeRarity} />}
		</CustomizedToggle>
		<CustomizedToggle label="Lava lakes"
			value={model.lavaLakes} onChange={v => changeModel({ lavaLakes: v })}
			initial={DefaultModel.lavaLakes}>
			{model.lavaLakes && <CustomizedSlider label="Rarity"
				value={model.lavaLakeRarity} onChange={v => changeModel({ lavaLakeRarity: v })}
				min={1} max={100} initial={DefaultModel.lavaLakeRarity} />}
		</CustomizedToggle>
	</>
}

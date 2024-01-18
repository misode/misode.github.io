import type { CustomizedModel } from './CustomizedModel.js'
import { CustomizedSlider } from './CustomizedSlider.jsx'
import { CustomizedToggle } from './CustomizedToggle.jsx'

interface Props {
	model: CustomizedModel,
	initialModel: CustomizedModel,
	changeModel: (model: Partial<CustomizedModel>) => void,
}
export function StructuresSettings({ model, initialModel, changeModel }: Props) {
	return <>
		<CustomizedToggle label="Ancient cities"
			value={model.ancientCities} onChange={v => changeModel({ ancientCities: v })}
			initial={initialModel.ancientCities} />
		<CustomizedToggle label="Buried treasures"
			value={model.buriedTreasures} onChange={v => changeModel({ buriedTreasures: v })}
			initial={initialModel.buriedTreasures} />
		<CustomizedToggle label="Desert pyramids"
			value={model.desertPyramids} onChange={v => changeModel({ desertPyramids: v })}
			initial={initialModel.desertPyramids} />
		<CustomizedToggle label="Igloos"
			value={model.igloos} onChange={v => changeModel({ igloos: v })}
			initial={initialModel.igloos} />
		<CustomizedToggle label="Jungle temples"
			value={model.jungleTemples} onChange={v => changeModel({ jungleTemples: v })}
			initial={initialModel.jungleTemples} />
		<CustomizedToggle label="Mineshafts"
			value={model.mineshafts} onChange={v => changeModel({ mineshafts: v })}
			initial={initialModel.mineshafts} />
		<CustomizedToggle label="Ocean monuments"
			value={model.oceanMonuments} onChange={v => changeModel({ oceanMonuments: v })}
			initial={initialModel.oceanMonuments} />
		<CustomizedToggle label="Ocean ruins"
			value={model.oceanRuins} onChange={v => changeModel({ oceanRuins: v })}
			initial={initialModel.oceanRuins} />
		<CustomizedToggle label="Pillager outposts"
			value={model.pillagerOutposts} onChange={v => changeModel({ pillagerOutposts: v })}
			initial={initialModel.pillagerOutposts} />
		<CustomizedToggle label="Ruined portals"
			value={model.ruinedPortals} onChange={v => changeModel({ ruinedPortals: v })}
			initial={initialModel.ruinedPortals} />
		<CustomizedToggle label="Shipwrecks"
			value={model.shipwrecks} onChange={v => changeModel({ shipwrecks: v })}
			initial={initialModel.shipwrecks} />
		<CustomizedToggle label="Strongholds"
			value={model.strongholds} onChange={v => changeModel({ strongholds: v })}
			initial={initialModel.strongholds} />
		<CustomizedToggle label="Swamp huts"
			value={model.swampHuts} onChange={v => changeModel({ swampHuts: v })}
			initial={initialModel.swampHuts} />
		<CustomizedToggle label="Trail ruins"
			value={model.trailRuins} onChange={v => changeModel({ trailRuins: v })}
			initial={initialModel.trailRuins} />
		<CustomizedToggle label="Villages"
			value={model.villages} onChange={v => changeModel({ villages: v })}
			initial={initialModel.villages} />
		<CustomizedToggle label="Woodland mansions"
			value={model.woodlandMansions} onChange={v => changeModel({ woodlandMansions: v })}
			initial={initialModel.woodlandMansions} />
		<CustomizedToggle label="Dungeons" help="The smaller monster rooms with a spawner and chest"
			value={model.dungeons} onChange={v => changeModel({ dungeons: v })}
			initial={initialModel.dungeons}>
			{model.dungeons && <CustomizedSlider label="Tries" help="The number of attempts to generate per chunk"
				value={model.dungeonTries} onChange={v => changeModel({ dungeonTries: v })}
				min={1} max={256} initial={initialModel.dungeonTries} />}
		</CustomizedToggle>
		<div class="customized-group">
			<CustomizedToggle label="Lava lakes"
				value={model.lavaLakes} onChange={v => changeModel({ lavaLakes: v })}
				initial={initialModel.lavaLakes} />
			{model.lavaLakes && <div class="customized-childs">
				<CustomizedSlider label="Surface rarity" help="The chance that a lava lake attempts to generate on the surface, larger numbers make them rarer"
					value={model.lavaLakeRarity} onChange={v => changeModel({ lavaLakeRarity: v })}
					min={1} max={400} initial={initialModel.lavaLakeRarity} />
				<CustomizedSlider label="Underground rarity" help="The chance that a lava lake attempts to generate underground, larger numbers make them rarer"
					value={model.lavaLakeRarityUnderground} onChange={v => changeModel({ lavaLakeRarityUnderground: v })}
					min={1} max={400} initial={initialModel.lavaLakeRarityUnderground} />
			</div>}
		</div>
	</>
}

import { useMemo } from 'preact/hooks'
import { deepClone } from '../../Utils.js'
import { useAsync } from '../../hooks/useAsync.js'
import { fetchRegistries } from '../../services/DataFetcher.js'
import { Octicon, TextInput } from '../index.js'
import { CustomizedInput } from './CustomizedInput.jsx'
import type { CustomizedModel } from './CustomizedModel.js'
import { CustomizedSlider } from './CustomizedSlider.jsx'

interface Props {
	model: CustomizedModel,
	initialModel: CustomizedModel,
	changeModel: (model: Partial<CustomizedModel>) => void,
}
export function BiomesSettings({ model, initialModel, changeModel }: Props) {
	const { value: registries } = useAsync(() => fetchRegistries('1.20'))

	const biomes = useMemo(() => {
		const hiddenBiomes = new Set(['end_barrens', 'end_highlands', 'end_midlands', 'small_end_islands', 'the_end', 'basalt_deltas', 'crimson_forest', 'nether_wastes', 'soul_sand_valley', 'warped_forest', 'the_void'])
		return registries?.get('worldgen/biome')?.filter(b => !hiddenBiomes.has(b.replace(/^minecraft:/, '')))
	}, [registries])

	return <>
		<CustomizedSlider label="Biome size" help="The scale of the biome layout, 6 corresponds to the large biomes preset"
			value={model.biomeSize} onChange={v => changeModel({ biomeSize: v })}
			min={1} max={8} initial={initialModel.biomeSize} />
		<p class="customized-info">
			{Octicon.info}
			Changing the following settings will not affect the terrain, only which biomes are painted on the terrain.
		</p>
		{biomes?.map(key => {
			const biome = key.replace(/^minecraft:/, '')
			const state: string | undefined = model.biomeReplacements[biome]
			const onChange = (v: string | undefined) => {
				const biomeReplacements = deepClone(model.biomeReplacements)
				if (v === undefined || v === biome) {
					delete biomeReplacements[biome]
				} else {
					biomeReplacements[biome] = v
				}
				changeModel({ biomeReplacements })
			}
			return <CustomizedInput label={biome.replace(/^minecraft:/, '')}
				value={state ?? biome} onChange={onChange}
				initial={biome}>
				<button class={`customized-toggle${state === undefined ? ' customized-true' : ''}`} onClick={() => onChange(undefined)}>Keep</button>
				<span>/</span>
				<button class={`customized-toggle${state !== undefined ? ' customized-false' : ''}`} onClick={() => onChange(findReplacement(biome, model.biomeReplacements))}>Replace</button>
				{state !== undefined && <>
					<TextInput value={state} onChange={v => onChange(v)} />
				</>}
			</CustomizedInput>
		})}
	</>
}

function findReplacement(biome: string, replacements: Record<string, string>): string {
	let replacement = DefaultReplacements[biome]
	if (replacement === undefined) {
		return 'plains'
	}
	for (let i = 0; i < 10; i += 1) {
		if (biome === replacement) {
			return DefaultReplacements[biome]
		}
		if (!replacements[replacement]) {
			return replacement
		}
		replacement = replacements[replacement]
	}
	return DefaultReplacements[biome]
}

const DefaultReplacements: Record<string, string> = {
	badlands: 'desert',
	bamboo_jungle: 'jungle',
	beach: 'plains',
	birch_forest: 'forest',
	cherry_grove: 'meadow',
	cold_ocean: 'ocean',
	dark_forest: 'forest',
	deep_cold_ocean: 'deep_ocean',
	deep_dark: 'plains',
	deep_frozen_ocean: 'deep_ocean',
	deep_lukewarm_ocean: 'deep_ocean',
	deep_ocean: 'ocean',
	desert: 'savanna',
	dripstone_caves: 'plains',
	eroded_badlands: 'badlands',
	flower_forest: 'forest',
	forest: 'plains',
	frozen_ocean: 'cold_ocean',
	frozen_peaks: 'stony_peaks',
	frozen_river: 'river',
	grove: 'forest',
	ice_spikes: 'snowy_plains',
	jagged_peaks: 'stony_peaks',
	jungle: 'savanna',
	lukewarm_ocean: 'ocean',
	lush_caves: 'plains',
	mangrove_swamp: 'swamp',
	meadow: 'forest',
	mushroom_fields: 'plains',
	ocean: 'plains',
	old_growth_birch_forest: 'birch_forest',
	old_growth_pine_taiga: 'taiga',
	old_growth_spruce_taiga: 'taiga',
	plains: 'the_void',
	river: 'plains',
	savanna: 'plains',
	savanna_plateau: 'savanna',
	snowy_beach: 'beach',
	snowy_plains: 'plains',
	snowy_slopes: 'grove',
	snowy_taiga: 'taiga',
	sparse_jungle: 'jungle',
	stony_peaks: 'plains',
	stony_shore: 'beach',
	sunflower_plains: 'plains',
	swamp: 'river',
	taiga: 'forest',
	warm_ocean: 'ocean',
	windswept_forest: 'forest',
	windswept_gravelly_hills: 'windswept_hills',
	windswept_hills: 'plains',
	windswept_savanna: 'savanna',
	wooded_badlands: 'badlands',
}

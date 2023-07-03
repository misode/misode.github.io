import { Identifier } from 'deepslate'
import { deepClone, deepEqual } from '../../Utils.js'
import { fetchAllPresets, fetchBlockStates } from '../../services/DataFetcher.js'
import type { VersionId } from '../../services/Schemas.js'
import type { CustomizedOreModel } from './CustomizedModel.js'
import { CustomizedModel } from './CustomizedModel.js'

// Random prefix to avoid collisions with other packs that add no-op placed features
const FeatureCollisionPrefix = 468794

const PackTypes = ['dimension_type', 'worldgen/noise_settings', 'worldgen/noise', 'worldgen/structure_set', 'worldgen/placed_feature', 'worldgen/configured_feature', 'worldgen/configured_carver'] as const
export type CustomizedPackType = typeof PackTypes[number]

export type CustomizedPack = Record<CustomizedPackType, Map<string, any>>

interface Context {
	model: CustomizedModel,
	initial: CustomizedModel,
	version: VersionId,
	blockStates: Map<string, {properties: Record<string, string[]>, default: Record<string, string>}>,
	vanilla: CustomizedPack,
	out: CustomizedPack,
	featureCollisionIndex: number,
}

export async function generateCustomized(model: CustomizedModel, version: VersionId): Promise<CustomizedPack> {
	const [blockStates, ...vanillaFiles] = await Promise.all([
		fetchBlockStates(version),
		...PackTypes.map(t => fetchAllPresets(version, t)),
	])
	const ctx: Context = {
		model,
		initial: CustomizedModel.getDefault(version),
		version,
		blockStates,
		vanilla: PackTypes.reduce((acc, k, i) => {
			return { ...acc, [k]: vanillaFiles[i] }
		}, Object.create(null)),
		out: PackTypes.reduce((acc, k) => {
			return { ...acc, [k]: new Map()}
		}, Object.create(null)) as CustomizedPack,
		featureCollisionIndex: FeatureCollisionPrefix,
	}
	generateDimensionType(ctx)
	generateNoiseSettings(ctx)
	generateCarvers(ctx)
	generateClimateNoises(ctx)
	generateStructures(ctx)
	generateDungeonFeatures(ctx)
	generateLakeFeatures(ctx)
	generateOreFeatures(ctx)
	return ctx.out
}

function generateDimensionType(ctx: Context) {
	if (isUnchanged(ctx, 'minHeight', 'maxHeight')) return
	ctx.out.dimension_type.set('overworld', {
		...ctx.vanilla.dimension_type.get('overworld'),
		min_y: ctx.model.minHeight,
		height: ctx.model.maxHeight - ctx.model.minHeight,
		logical_height: ctx.model.maxHeight - ctx.model.minHeight,
	  })
}

function generateNoiseSettings(ctx: Context) {
	if (isUnchanged(ctx, 'minHeight', 'maxHeight', 'seaLevel', 'oceans', 'caves', 'noiseCaves')) return
	const defaultFluid = formatIdentifier(ctx.model.oceans)
	const vanilla = ctx.vanilla['worldgen/noise_settings'].get('overworld')
	const finalDensity = deepClone(vanilla.noise_router.final_density)
	if (!ctx.model.caves || !ctx.model.noiseCaves) {
		finalDensity.argument2 = 1
		finalDensity.argument1.argument.argument2.argument.argument.argument2.argument2.argument2.argument2.argument2.argument2 = 'minecraft:overworld/sloped_cheese'
	}
	ctx.out['worldgen/noise_settings'].set('overworld', {
		...vanilla,
		sea_level: ctx.model.seaLevel,
		default_fluid: {
			Name: defaultFluid,
			Properties: ctx.blockStates.get(defaultFluid)?.default,
		},
		noise: {
			...vanilla.noise,
			min_y: ctx.model.minHeight,
			height: ctx.model.maxHeight - ctx.model.minHeight,
		},
		noise_router: {
			...vanilla.noise_router,
			final_density: finalDensity,
		},
	})
}

function generateCarvers(ctx: Context) {
	if (isUnchanged(ctx, 'caves', 'carverCaves', 'ravines')) return
	if (!ctx.model.caves || !ctx.model.carverCaves) {
		const vanilla = ctx.vanilla['worldgen/configured_carver'].get('cave')
		ctx.out['worldgen/configured_carver'].set('cave', {
			...vanilla,
			config: {
				...vanilla.config,
				probability: 0,
			},
		})
		const extraVanilla = ctx.vanilla['worldgen/configured_carver'].get('cave')
		ctx.out['worldgen/configured_carver'].set('cave_extra_underground', {
			...extraVanilla,
			config: {
				...extraVanilla.config,
				probability: 0,
			},
		})
	}
	if (!ctx.model.caves || !ctx.model.ravines) {
		const vanilla = ctx.vanilla['worldgen/configured_carver'].get('canyon')
		ctx.out['worldgen/configured_carver'].set('canyon', {
			...vanilla,
			config: {
				...vanilla.config,
				probability: 0,
			},
		})
	}
}

function generateClimateNoises(ctx: Context) {
	if (isUnchanged(ctx, 'biomeSize')) return
	for (const name of ['temperature', 'vegetation', 'continentalness', 'erosion']) {
		const vanilla = ctx.vanilla['worldgen/noise'].get(name)
		ctx.out['worldgen/noise'].set(name, {
			...vanilla,
			firstOctave: vanilla.firstOctave - ctx.model.biomeSize + 4,
		})
	}
}

const Structures: Partial<Record<keyof CustomizedModel, string>> = {
	ancientCities: 'ancient_cities',
	buriedTreasures: 'buried_treasures',
	desertPyramids: 'desert_pyramids',
	igloos: 'igloos',
	jungleTemples: 'jungle_temples',
	mineshafts: 'mineshafts',
	oceanMonuments: 'ocean_monuments',
	oceanRuins: 'ocean_ruins',
	pillagerOutposts: 'pillager_outposts',
	ruinedPortals: 'ruined_portals',
	shipwrecks: 'shipwrecks',
	strongholds: 'strongholds',
	swampHuts: 'swamp_huts',
	trailRuins: 'trail_ruins',
	villages: 'villages',
	woodlandMansions: 'woodland_mansions',
}

function generateStructures(ctx: Context) {
	for (const [key, name] of Object.entries(Structures) as [keyof CustomizedModel, string][]) {
		if (isUnchanged(ctx, key) || ctx.model[key]) continue
		ctx.out['worldgen/structure_set'].set(name, {
			...ctx.vanilla['worldgen/structure_set'].get(name),
			structures: [],
		})
	}
}

function getDisabledFeature(ctx: Context) {
	ctx.featureCollisionIndex += 1
	return {
		feature: {
			type: 'minecraft:no_op',
			config: {},
		},
		placement: [
			{
				type: 'minecraft:rarity_filter',
				chance: ctx.featureCollisionIndex,
			},
		],
	}
}

function generateDungeonFeatures(ctx: Context) {
	if (isUnchanged(ctx, 'dungeons', 'dungeonTries')) return
	if (!ctx.model.dungeons) {
		ctx.out['worldgen/placed_feature'].set('monster_room_deep', getDisabledFeature(ctx))
		ctx.out['worldgen/placed_feature'].set('monster_room', getDisabledFeature(ctx))
	} else {
		const deepTries = Math.round(ctx.model.dungeonTries * 4 / 14)
		const deepVanilla = ctx.vanilla['worldgen/placed_feature'].get('monster_room_deep')
		ctx.out['worldgen/placed_feature'].set('monster_room_deep', {
			...deepVanilla,
			placement: [
				{
					type: 'minecraft:count',
					count: deepTries,
				},
				...deepVanilla.placement.slice(1),
			],
		})
		const normalVanilla = ctx.vanilla['worldgen/placed_feature'].get('monster_room')
		ctx.out['worldgen/placed_feature'].set('monster_room', {
			...normalVanilla,
			placement: [
				{
					type: 'minecraft:count',
					count: ctx.model.dungeonTries - deepTries,
				},
				...normalVanilla.placement.slice(1),
			],
		})
	}
}

function generateLakeFeatures(ctx: Context) {
	if (!isUnchanged(ctx, 'lavaLakes', 'lavaLakeRarity', 'lavaLakeRarityUnderground')) {
		if (!ctx.model.lavaLakes) {
			ctx.out['worldgen/placed_feature'].set('lake_lava_surface', getDisabledFeature(ctx))
			ctx.out['worldgen/placed_feature'].set('lake_lava_underground', getDisabledFeature(ctx))
		} else {
			const undergroundVanilla = ctx.vanilla['worldgen/placed_feature'].get('lake_lava_underground')
			ctx.out['worldgen/placed_feature'].set('lake_lava_underground', {
				...undergroundVanilla,
				placement: [
					{
						type: 'minecraft:rarity_filter',
						chance: ctx.model.lavaLakeRarityUnderground,
					},
					...undergroundVanilla.placement.slice(1),
				],
			})
			const surfaceVanilla = ctx.vanilla['worldgen/placed_feature'].get('lake_lava_surface')
			ctx.out['worldgen/placed_feature'].set('lake_lava_surface', {
				...surfaceVanilla,
				placement: [
					{
						type: 'minecraft:rarity_filter',
						chance: ctx.model.lavaLakeRarity,
					},
					...surfaceVanilla.placement.slice(1),
				],
			})
		}
	}
}

const Ores: Partial<Record<keyof CustomizedModel, string>> = {
	dirt: 'ore_dirt',
	gravel: 'ore_gravel',
	graniteLower: 'ore_granite_lower',
	graniteUpper: 'ore_granite_upper',
	dioriteLower: 'ore_diorite_lower',
	dioriteUpper: 'ore_diorite_upper',
	andesiteLower: 'ore_andesite_lower',
	andesiteUpper: 'ore_andesite_upper',
	coalLower: 'ore_coal_lower',
	coalUpper: 'ore_coal_upper',
	ironSmall: 'ore_iron_small',
	ironMiddle: 'ore_iron_middle',
	ironUpper: 'ore_iron_upper',
	copper: 'ore_copper',
	copperLarge: 'ore_copper_large',
	goldLower: 'ore_gold_lower',
	gold: 'ore_gold',
	redstoneLower: 'ore_redstone_lower',
	redstone: 'ore_redstone',
	lapis: 'ore_lapis',
	lapisBuried: 'ore_lapis_buried',
	emerald: 'ore_emerald',
	diamond: 'ore_diamond',
	diamondBuried: 'ore_diamond_buried',
	diamondLarge: 'ore_diamond_large',
}

function generateOreFeatures(ctx: Context) {
	for (const [key, name] of Object.entries(Ores) as [keyof CustomizedModel, string][]) {
		if (isUnchanged(ctx, key)) continue
		const value = ctx.model[key] as CustomizedOreModel | undefined
		const initial = ctx.initial[key] as CustomizedOreModel
		if (value === undefined) {
			ctx.out['worldgen/placed_feature'].set(name, getDisabledFeature(ctx))
		} else {
			const placed = deepClone(ctx.vanilla['worldgen/placed_feature'].get(name))
			if (value.tries !== initial.tries) {
				const modifier = placed.placement.find((m: any) => m.type === 'minecraft:count' || m.type === 'minecraft:rarity_filter')
				if (Number.isInteger(value.tries)) {
					modifier.type = 'minecraft:count',
					modifier.count = value.tries
					delete modifier.chance
				} else {
					modifier.type = 'minecraft:rarity_filter',
					modifier.chance = Math.round(1 / value.tries)
					delete modifier.count
				}
			}
			if (value.minHeight !== initial.minHeight || value.minAboveBottom !== initial.minAboveBottom || value.minBelowTop !== initial.minBelowTop || value.maxHeight !== initial.maxHeight || value.maxAboveBottom !== value.maxBelowTop || value.maxBelowTop !== initial.maxBelowTop) {
				const modifier = placed.placement.find((m: any) => m.type === 'minecraft:height_range')
				modifier.min_inclusive = value.minAboveBottom !== undefined ? { above_bottom: value.minAboveBottom } : value.minBelowTop !== undefined ? { below_top: value.minBelowTop } : value.minHeight !== undefined ? { absolute: value.minHeight } : modifier.min_inclusive
				modifier.max_inclusive = value.maxAboveBottom !== undefined ? { above_bottom: value.maxAboveBottom } : value.maxBelowTop !== undefined ? { below_top: value.maxBelowTop } : value.maxHeight !== undefined ? { absolute: value.maxHeight } : modifier.max_inclusive
			}
			ctx.out['worldgen/placed_feature'].set(name, placed)
			if (value.size !== initial.size) {
				const reference = placed.feature.replace(/^minecraft:/, '')
				const configured = ctx.vanilla['worldgen/configured_feature'].get(reference)
				configured.config.size = value.size
				ctx.out['worldgen/configured_feature'].set(reference, configured)
			}
		}
	}
}

function isUnchanged(ctx: Context, ...keys: (keyof CustomizedModel)[]) {
	return keys.every(k => deepEqual(ctx.model[k], ctx.initial[k]))
}

function formatIdentifier(id: string) {
	try {
		return Identifier.parse(id).toString()
	} catch (e) {
		return id
	}
}

import { DataModel } from '@mcschema/core'
import type { Random } from 'deepslate'
import { LegacyRandom, PerlinNoise } from 'deepslate'
import type { VersionId } from '../services'
import { checkVersion } from '../services'
import { clamp, isObject, stringToColor } from '../Utils'

type BlockPos = [number, number, number]
type Placement = [BlockPos, number]

type PlacementContext = {
	placements: Placement[],
	features: string[],
	random: Random,
	biomeInfoNoise: PerlinNoise,
	seaLevel: number,
	version: VersionId,
	nextFloat(): number,
	nextInt(max: number): number,
	nextGaussian(): number,
	sampleInt(provider: any): number,
}

const terrain = [50, 50, 51, 51, 52, 52, 53, 54, 56, 57, 57, 58, 58, 59, 60, 60, 60, 59, 59, 59, 60, 61, 61, 62, 63, 63, 64, 64, 64, 65, 65, 66, 66, 65, 65, 66, 66, 67, 67, 67, 68, 69, 71, 73, 74, 76, 79, 80, 81, 81, 82, 83, 83, 82, 82, 81, 81, 80, 80, 80, 81, 81, 82, 82] 

const featureColors = [
	[255, 77, 54],  // red
	[59, 118, 255], // blue
	[91, 207, 25],  // green
	[217, 32, 245], // magenta
	[255, 209, 41], // yellow
	[52, 204, 209], // cyan
]

export type DecoratorOptions = {
	size: [number, number, number],
	seed: bigint,
	version: VersionId,
}
export function decorator(state: any, img: ImageData, options: DecoratorOptions) {
	const random = new LegacyRandom(options.seed)
	const ctx: PlacementContext = {
		placements: [],
		features: [],
		random,
		biomeInfoNoise: new PerlinNoise(random.fork(), 0, [1]),
		seaLevel: 63,
		version: options.version,
		nextFloat: () => random.nextFloat(),
		nextInt: (max: number) => random.nextInt(max),
		nextGaussian: () => Math.sqrt(-2 * Math.log(1 - random.nextFloat())) * Math.cos(2 * Math.PI * random.nextFloat()),
		sampleInt(value) { return sampleInt(value, this) },
	}

	for (let x = 0; x < options.size[0] / 16; x += 1) {
		for (let z = 0; z < options.size[2] / 16; z += 1) {
			if (checkVersion(options.version, undefined, '1.17')) {
				getPlacements([x * 16, 0, z * 16], DataModel.unwrapLists(state), ctx)
			} else {
				modifyPlacement([x * 16, 0, z * 16], DataModel.unwrapLists(state.placement), ctx)
			}
		}
	}

	const data = img.data
	img.data.fill(255)

	for (const [pos, feature] of ctx.placements) {
		if (pos[0] < 0 || pos[1] < 0 || pos[2] < 0 || pos[0] >= options.size[0] || pos[1] >= options.size[1] || pos[2] >= options.size[2]) continue
		const i = (pos[2] * (img.width * 4)) + (pos[0] * 4)
		const color = feature < featureColors.length ? featureColors[feature] : stringToColor(ctx.features[feature])
		data[i] = clamp(50, 205, color[0])
		data[i + 1] = clamp(50, 205, color[1])
		data[i + 2] = clamp(50, 205, color[2])
		data[i + 3] = 255
	}

	for (let x = 0; x < options.size[0]; x += 1) {
		for (let y = 0; y < options.size[2]; y += 1) {
			if ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0) continue
			const i = (y * (img.width * 4)) + (x * 4)
			for (let j = 0; j < 3; j += 1) {
				data[i + j] = 0.85 * data[i + j] 
			}
		}
	}
}

function normalize(id: string) {
	return id.startsWith('minecraft:') ? id.slice(10) : id
}

function decorateY(pos: BlockPos, y: number): BlockPos[] {
	return [[ pos[0], y, pos[2] ]]
}

function sampleInt(value: any, ctx: PlacementContext): number {
	if (typeof value === 'number') {
		return value
	} else if (value.base) {
		return value.base ?? 1 + ctx.nextInt(1 + (value.spread ?? 0))
	} else {
		switch (normalize(value.type)) {
			case 'constant': return value.value
			case 'uniform': return value.value.min_inclusive + ctx.nextInt(value.value.max_inclusive - value.value.min_inclusive + 1)
			case 'biased_to_bottom': return value.value.min_inclusive + ctx.nextInt(ctx.nextInt(value.value.max_inclusive - value.value.min_inclusive + 1) + 1)
			case 'clamped': return clamp(ctx.sampleInt(value.value.source), value.value.min_inclusive, value.value.max_inclusive)
			case 'clamped_normal':
				const normal = value.value.mean + ctx.nextGaussian() * value.value.deviation
				return Math.floor(clamp(value.value.min_inclusive, value.value.max_inclusive, normal))
			case 'weighted_list':
				const totalWeight = (value.distribution as any[]).reduce<number>((sum, e) => sum + e.weight, 0)
				let i = ctx.nextInt(totalWeight)
				for (const e of value.distribution) {
					i -= e.weight
					if (i < 0) return ctx.sampleInt(e.data)
				}
				return 0
		}
		return 1
	}
}

function resolveAnchor(anchor: any, _ctx: PlacementContext): number {
	if (!isObject(anchor)) throw new Error('Invalid vertical anchor')
	if (anchor.absolute) return anchor.absolute
	if (anchor.above_bottom) return anchor.above_bottom
	if (anchor.below_top) return 256 - anchor.below_top
	throw new Error('Invalid vertical anchor')
}

function sampleHeight(height: any, ctx: PlacementContext): number {
	if (!isObject(height)) throw new Error('Invalid height provider')
	if (typeof height.type !== 'string') {
		return resolveAnchor(height, ctx)
	}
	switch (normalize(height.type)) {
		case 'constant': return resolveAnchor(height.value, ctx)
		case 'uniform': {
			const min = resolveAnchor(height.min_inclusive, ctx)
			const max = resolveAnchor(height.max_inclusive, ctx)
			return min + ctx.nextInt(max - min + 1)
		}
		case 'biased_to_bottom': {
			const min = resolveAnchor(height.min_inclusive, ctx)
			const max = resolveAnchor(height.max_inclusive, ctx)
			const n = ctx.nextInt(max - min - (height.inner ?? 1) + 1)
			return min + ctx.nextInt(n + (height.inner ?? 1))
		}
		case 'very_biased_to_bottom': {
			const min = resolveAnchor(height.min_inclusive, ctx)
			const max = resolveAnchor(height.max_inclusive, ctx)
			const inner = height.inner ?? 1
			const n1 = min + inner + ctx.nextInt(max - min - inner + 1)
			const n2 = min + ctx.nextInt(n1 - min)
			return min + ctx.nextInt(n2 - min + inner)
		}
		case 'trapezoid': {
			const min = resolveAnchor(height.min_inclusive, ctx)
			const max = resolveAnchor(height.max_inclusive, ctx)
			const plateau = height.plateau ?? 0
			if (plateau >= max - min) {
				return min + ctx.nextInt(max - min + 1)
			}
			const n1 = (max - min - plateau) / 2
			const n2 = (max - min) - n1
			return min + ctx.nextInt(n2 + 1) + ctx.nextInt(n1 + 1)
		}
		default: throw new Error(`Invalid height provider ${height.type}`)
	}
}

// 1.17 and before
function useFeature(s: string, ctx: PlacementContext) {
	const i = ctx.features.indexOf(s)
	if (i != -1) return i
	ctx.features.push(s)
	return ctx.features.length - 1
}

function getPlacements(pos: BlockPos, feature: any, ctx: PlacementContext): void {
	if (typeof feature === 'string') {
		ctx.placements.push([pos, useFeature(feature, ctx)])
		return
	}
	const type = normalize(feature?.type ?? 'no_op')
	const featureFn = Features[type]
	if (featureFn) {
		featureFn(feature.config, pos, ctx)
	} else {
		ctx.placements.push([pos, useFeature(JSON.stringify(feature), ctx)])
	}
}

function getPositions(pos: BlockPos, decorator: any, ctx: PlacementContext): BlockPos[] {
	const type = normalize(decorator?.type ?? 'nope')
	const decoratorFn = Decorators[type]
	if (!decoratorFn) {
		return [pos]
	}
	return decoratorFn(decorator?.config, pos, ctx)
}

const Features: {
	[key: string]: (config: any, pos: BlockPos, ctx: PlacementContext) => void,
} = {
	decorated: (config, pos, ctx) => {
		const positions = getPositions(pos, config?.decorator, ctx)
		positions.forEach(p => getPlacements(p, config?.feature, ctx))
	},
	random_boolean_selector: (config, pos, ctx) => {
		const feature = ctx.nextFloat() < 0.5 ? config?.feature_true : config?.feature_false
		getPlacements(pos, feature, ctx)
	},
	random_selector: (config, pos, ctx) => {
		for (const f of config?.features ?? []) {
			if (ctx.nextFloat() < (f?.chance ?? 0)) {
				getPlacements(pos, f.feature, ctx)
				return
			}
		}
		getPlacements(pos, config?.default, ctx)
	},
	simple_random_selector: (config, pos, ctx) => {
		const feature = config?.features?.[ctx.nextInt(config?.features?.length ?? 0)]
		getPlacements(pos, feature, ctx)
	},
}

const Decorators: {
	[key: string]: (config: any, pos: BlockPos, ctx: PlacementContext) => BlockPos[],
} = {
	chance: (config, pos, ctx) => {
		return ctx.nextFloat() < 1 / (config?.chance ?? 1) ? [pos] : []
	},
	count: (config, pos, ctx) => {
		return new Array(ctx.sampleInt(config?.count ?? 1)).fill(pos)
	},
	count_extra: (config, pos, ctx) => {
		let count = config?.count ?? 1
		if (ctx.nextFloat() < config.extra_chance ?? 0){
			count += config.extra_count ?? 0
		}
		return new Array(count).fill(pos)
	},
	count_multilayer: (config, pos, ctx) => {
		return new Array(ctx.sampleInt(config?.count ?? 1)).fill(pos)
			.map(p => [
				p[0] + ctx.nextInt(16),
				p[1], 
				p[2] + ctx.nextInt(16),
			])
	},
	count_noise: (config, pos, ctx) => {
		const noise = ctx.biomeInfoNoise.sample(pos[0] / 200, 0, pos[2] / 200)
		const count = noise < config.noise_level ? config.below_noise : config.above_noise
		return new Array(count).fill(pos)
	},
	count_noise_biased: (config, pos, ctx) => {
		const factor = Math.max(1, config.noise_factor)
		const noise = ctx.biomeInfoNoise.sample(pos[0] / factor, 0, pos[2] / factor)
		const count = Math.max(0, Math.ceil((noise + (config.noise_offset ?? 0)) * config.noise_to_count_ratio))
		return new Array(count).fill(pos)
	},
	dark_oak_tree: (_config, pos, ctx) => {
		return [...new Array(16)].map((_, i) => {
			const x = Math.floor(i / 4) * 4 + 1 + ctx.nextInt(3) + pos[0]
			const y = Math.max(ctx.seaLevel, terrain[clamp(0, 63, x)])
			const z = Math.floor(i % 4) * 4 + 1 + ctx.nextInt(3) + pos[2]
			return [x, y, z]
		})
	},
	decorated: (config, pos, ctx) => {
		return getPositions(pos, config?.outer, ctx).flatMap(p => {
			return getPositions(p, config?.inner, ctx)
		})
	},
	depth_average: (config, pos, ctx) => {
		const y = ctx.nextInt(config?.spread ?? 0) + ctx.nextInt(config?.spread ?? 0) - (config.spread ?? 0) + (config?.baseline ?? 0)
		return decorateY(pos, y)
	},
	emerald_ore: (_config, pos, ctx) => {
		const count = 3 + ctx.nextInt(6)
		return [...new Array(count)].map(() => [
			pos[0] + ctx.nextInt(16),
			4 + ctx.nextInt(28),
			pos[2] + ctx.nextInt(16),
		])
	},
	fire: (config, pos, ctx) => {
		const count = 1 + ctx.nextInt(ctx.nextInt(ctx.sampleInt(config?.count)))
		return [...new Array(count)].map(() => [
			pos[0] + ctx.nextInt(16),
			ctx.nextInt(128),
			pos[2] + ctx.nextInt(16),
		])
	},
	glowstone: (config, pos, ctx) => {
		const count = ctx.nextInt(1 + ctx.nextInt(ctx.sampleInt(config?.count)))
		return [...new Array(count)].map(() => [
			pos[0] + ctx.nextInt(16),
			ctx.nextInt(128),
			pos[2] + ctx.nextInt(16),
		])
	},
	heightmap: (_config, pos, ctx) => {
		const y = Math.max(ctx.seaLevel, terrain[clamp(0, 63, pos[0])])
		return decorateY(pos, y)
	},
	heightmap_spread_double: (_config, pos, ctx) => {
		const y = Math.max(ctx.seaLevel, terrain[clamp(0, 63, pos[0])])
		return decorateY(pos, ctx.nextInt(y * 2))
	},
	heightmap_world_surface: (_config, pos, ctx) => {
		const y = Math.max(ctx.seaLevel, terrain[clamp(0, 63, pos[0])])
		return decorateY(pos, y)
	},
	iceberg: (_config, pos, ctx) => {
		return [[
			pos[0] + 4 + ctx.nextInt(8),
			pos[1],
			pos[2] + 4 + ctx.nextInt(8),
		]]
	},
	lava_lake: (config, pos, ctx) => {
		if (ctx.nextInt((config.chance ?? 1) / 10) === 0) {
			const y = ctx.nextInt(ctx.nextInt(256 - 8) + 8)
			if (y < ctx.seaLevel || ctx.nextInt((config?.chance ?? 1) / 8) == 0) {
				const x = ctx.nextInt(16) + pos[0]
				const z = ctx.nextInt(16) + pos[2]
				return [[x, y, z]]
			}
		}
		return []
	},
	nope: (_config, pos) => {
		return [pos]
	},
	range: (config, pos, ctx) => {
		const y = ctx.nextInt((config?.maximum ?? 1) - (config?.top_offset ?? 0)) + (config?.bottom_offset ?? 0)
		return decorateY(pos, y)
	},
	range_biased: (config, pos, ctx) => {
		const y = ctx.nextInt(ctx.nextInt((config?.maximum ?? 1) - (config?.top_offset ?? 0)) + (config?.bottom_offset ?? 0))
		return decorateY(pos, y)
	},
	range_very_biased: (config, pos, ctx) => {
		const y = ctx.nextInt(ctx.nextInt(ctx.nextInt((config?.maximum ?? 1) - (config?.top_offset ?? 0)) + (config?.bottom_offset ?? 0)) + (config?.bottom_offset ?? 0))
		return decorateY(pos, y)
	},
	spread_32_above: (_config, pos, ctx) => {
		const y = ctx.nextInt(pos[1] + 32)
		return decorateY(pos, y)
	},
	top_solid_heightmap: (_config, pos) => {
		const y = terrain[clamp(0, 63, pos[0])]
		return decorateY(pos, y)
	},
	magma: (_config, pos, ctx) => {
		const y = ctx.nextInt(pos[1] + 32)
		return decorateY(pos, y)
	},
	square: (_config, pos, ctx) => {
		return [[
			pos[0] + ctx.nextInt(16),
			pos[1],
			pos[2] + ctx.nextInt(16),
		]]
	},
	surface_relative_threshold: (config, pos) => {
		const height = terrain[clamp(0, 63, pos[0])]
		const min = height + (config?.min_inclusive ?? -Infinity)
		const max = height + (config?.max_inclusive ?? Infinity)
		return (pos[1] < min || pos[1] > max) ? [pos] : []
	},
	water_lake: (config, pos, ctx) => {
		if (ctx.nextInt(config.chance ?? 1) === 0) {
			return [[
				pos[0] + ctx.nextInt(16),
				ctx.nextInt(256),
				pos[2] + ctx.nextInt(16),
			]]
		}
		return []
	},
}

// 1.18 and after
function modifyPlacement(pos: BlockPos, placement: any[], ctx: PlacementContext) {
	let positions = [pos]
	for (const modifier of placement) {
		const modifierFn = PlacementModifiers[normalize(modifier?.type ?? 'nope')]
		if (!modifierFn) continue
		positions = positions.flatMap(pos =>
			PlacementModifiers[normalize(modifier.type)](modifier, pos, ctx)
		)
	}
	for (const pos of positions) {
		ctx.placements.push([pos, 0])
	}
}

const PlacementModifiers: {
	[key: string]: (config: any, pos: BlockPos, ctx: PlacementContext) => BlockPos[],
} = {
	count: ({ count }, pos, ctx) => {
		return new Array(ctx.sampleInt(count ?? 1)).fill(pos)
	},
	count_on_every_layer: ({ count }, pos, ctx) => {
		return new Array(ctx.sampleInt(count ?? 1)).fill(pos)
			.map(p => [
				p[0] + ctx.nextInt(16),
				p[1], 
				p[2] + ctx.nextInt(16),
			])
	},
	environment_scan: ({}, pos) => {
		return [pos]
	},
	height_range: ({ height }, pos, ctx) => {
		return decorateY(pos, sampleHeight(height, ctx))
	},
	heightmap: ({}, pos, ctx) => {
		const y = Math.max(ctx.seaLevel, terrain[clamp(0, 63, pos[0])])
		return decorateY(pos, y)
	},
	in_square: ({}, pos, ctx) => {
		return [[
			pos[0] + ctx.nextInt(16),
			pos[1],
			pos[2] + ctx.nextInt(16),
		]]
	},
	noise_based_count: ({ noise_to_count_ratio, noise_factor, noise_offset }, pos, ctx) => {
		const factor = Math.max(1, noise_factor)
		const noise = ctx.biomeInfoNoise.sample(pos[0] / factor, 0, pos[2] / factor)
		const count = Math.max(0, Math.ceil((noise + (noise_offset ?? 0)) * noise_to_count_ratio))
		return new Array(count).fill(pos)
	},
	noise_threshold_count: ({ noise_level, below_noise, above_noise }, pos, ctx) => {
		const noise = ctx.biomeInfoNoise.sample(pos[0] / 200, 0, pos[2] / 200)
		const count = noise < noise_level ? below_noise : above_noise
		return new Array(count).fill(pos)
	},
	random_offset: ({ xz_spread, y_spread }, pos, ctx) => {
		return [[
			pos[0] + ctx.sampleInt(xz_spread),
			pos[1] + ctx.sampleInt(y_spread),
			pos[2] + ctx.sampleInt(xz_spread),
		]]
	},
	rarity_filter: ({ chance }, pos, ctx) => {
		return ctx.nextFloat() < 1 / (chance ?? 1) ? [pos] : []
	},
}

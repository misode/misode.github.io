import type { Random } from 'deepslate'
import { BlockState } from 'deepslate'
import { clamp, isObject } from '../../Utils.js'
import type { VersionId } from '../../services/index.js'

export type WorldgenUtilsContext = {
	random: Random,
	version: VersionId,
	nextFloat(): number,
	nextInt(max: number): number,
	nextGaussian(): number,
}

export function nextGaussian(random: Random) {
	return () => Math.sqrt(-2 * Math.log(1 - random.nextFloat())) * Math.cos(2 * Math.PI * random.nextFloat())
}

export function normalizeId(id: string) {
	return id.startsWith('minecraft:') ? id.slice(10) : id
}

export function sampleInt(value: any, ctx: WorldgenUtilsContext): number {
	if (typeof value === 'number') {
		return value
	} else if (value.base) {
		return value.base ?? 1 + ctx.nextInt(1 + (value.spread ?? 0))
	} else {
		switch (normalizeId(value.type)) {
			case 'constant': return value.value
			case 'uniform': return value.value.min_inclusive + ctx.nextInt(value.value.max_inclusive - value.value.min_inclusive + 1)
			case 'biased_to_bottom': return value.value.min_inclusive + ctx.nextInt(ctx.nextInt(value.value.max_inclusive - value.value.min_inclusive + 1) + 1)
			case 'clamped': return clamp(sampleInt(value.value.source, ctx), value.value.min_inclusive, value.value.max_inclusive)
			case 'clamped_normal':
				const normal = value.value.mean + ctx.nextGaussian() * value.value.deviation
				return Math.floor(clamp(value.value.min_inclusive, value.value.max_inclusive, normal))
			case 'weighted_list':
				const totalWeight = (value.distribution as any[]).reduce<number>((sum, e) => sum + e.weight, 0)
				let i = ctx.nextInt(totalWeight)
				for (const e of value.distribution) {
					i -= e.weight
					if (i < 0) return sampleInt(e.data, ctx)
				}
				return 0
		}
		return 1
	}
}

export function resolveAnchor(anchor: any, _ctx: WorldgenUtilsContext): number {
	if (!isObject(anchor)) return 0
	if (anchor.absolute !== undefined) return anchor.absolute
	if (anchor.above_bottom !== undefined) return anchor.above_bottom
	if (anchor.below_top !== undefined) return 256 - anchor.below_top
	return 0
}

export function sampleHeight(height: any, ctx: WorldgenUtilsContext): number {
	if (!isObject(height)) throw new Error('Invalid height provider')
	if (typeof height.type !== 'string') {
		return resolveAnchor(height, ctx)
	}
	switch (normalizeId(height.type)) {
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

export function sampleBlockState(provider: any, _ctx: WorldgenUtilsContext): BlockState {
	const type = provider.type.replace(/^minecraft:/, '')
	switch (type) {
		case 'simple_state_provider': {
			return BlockState.fromJson(provider.state)
		}
	}
	return BlockState.AIR
}

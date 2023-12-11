import type { BlockState, Random } from 'deepslate'
import { BlockPos } from 'deepslate'
import type { VersionId } from '../../services/index.js'
import { sampleBlockState, sampleInt } from './WorldgenUtils.jsx'

export type FeatureContext = {
	version: VersionId,
	random: Random,
	place: (pos: BlockPos, block: string | BlockState) => void,
	nextFloat(): number,
	nextInt(max: number): number,
	nextGaussian(): number,
}

export function placeFeature(data: any, ctx: FeatureContext) {
	const type = data.type.replace(/^minecraft:/, '')
	Features[type]?.(data.config, ctx)
}

const Features: {
	[key: string]: (config: any, ctx: FeatureContext) => void,
} = {
	tree: (config, ctx) => {
		const trunk = config.trunk_placer
		const trunkPlacerType = trunk.type.replace(/^minecraft:/, '')
		const treeHeight = trunk.base_height + ctx.nextInt(trunk.height_rand_a + 1) + ctx.nextInt(trunk.height_rand_b + 1)

		function placeLog(pos: BlockPos) {
			ctx.place(pos, sampleBlockState(config.trunk_provider, ctx))
		}

		const horizontalDirs = [[-1, 0], [0, 1], [1, 0], [0, -1]] as const
		const startPos = BlockPos.ZERO // TODO: roots
		switch (trunkPlacerType) {
			case 'upwards_branching_trunk_placer': {
				const branchProbability = trunk.place_branch_per_log_probability
				const	extraBranchLength = trunk.extra_branch_length
				const	extraBranchSteps = trunk.extra_branch_steps
				for (let i = 0; i < treeHeight; i += 1) {
					const y = startPos[1] + i
					placeLog(BlockPos.create(startPos[0], y, startPos[2]))
					if (i < treeHeight - 1 && ctx.nextFloat() < branchProbability) {
						const dir = horizontalDirs[ctx.nextInt(4)]
						const branchLength = Math.max(0, sampleInt(extraBranchLength, ctx) - sampleInt(extraBranchLength, ctx) - 1)
						let branchSteps = sampleInt(extraBranchSteps, ctx)
						let x = startPos[0]
						let z = startPos[1]
						for (let j = branchLength; length < treeHeight && branchSteps > 0; j += 1) {
							if (j >= 1) {
								x += dir[0]
								z += dir[1]
								placeLog([x, y + j, z])
							}
							branchSteps -= 1
						}
					}
				}
			}
		}
	},
}

import type {
	CollectionRegistry,
	SchemaRegistry,
} from '@mcschema/core'
import {
	BooleanNode,
	Case,
	ListNode,
	NumberNode,
	ObjectNode,
	Opt,
	Reference as RawReference,
	StringNode as RawStringNode,
	Switch,
} from '@mcschema/core'

const ID = 'dawn'

export function initDawnApi(schemas: SchemaRegistry, collections: CollectionRegistry) {
	const Reference = RawReference.bind(undefined, schemas)
	const StringNode = RawStringNode.bind(undefined, collections)

	collections.register(`${ID}:shape_type`, [
		'dawn:empty',
		'dawn:rectangle',
		'dawn:rectangular_prism',
		'dawn:rectangular_pyramid',
		'dawn:ellipse',
		'dawn:elliptical_prism',
		'dawn:elliptical_pyramid',
		'dawn:triangular_prism',
		'dawn:ellipsoid',
		'dawn:hemi_ellipsoid',
	])

	collections.register(`${ID}:shape_processor_type`, [
		'dawn:add',
		'dawn:subtract',
		'dawn:exclude',
		'dawn:intersect',
		'dawn:translate',
		'dawn:rotate',
		'dawn:scale',
		'dawn:noise_translate',
	])

	schemas.register(`${ID}:shape`, ObjectNode({
		type: StringNode({ validator: 'resource', params: { pool: `${ID}:shape_type` as any } }),
		[Switch]: [{ push: 'type' }],
		[Case]: {
			'dawn:rectangle': {
				width: NumberNode(),  //TODO: float provider
				height: NumberNode(), //TODO: float provider
			},
			'dawn:rectangular_prism': {
				width: NumberNode(),  //TODO: float provider
				height: NumberNode(), //TODO: float provider
				depth: NumberNode(),  //TODO: float provider
			},
			'dawn:rectangular_pyramid': {
				width: NumberNode(),  //TODO: float provider
				height: NumberNode(), //TODO: float provider, cannot contain 0.0
				depth: NumberNode(),  //TODO: float provider
			},
			'dawn:ellipse': {
				a: NumberNode(), //TODO: float provider, cannot contain 0.0
				b: NumberNode(), //TODO: float provider, cannot contain 0.0
			},
			'dawn:elliptical_prism': {
				a: NumberNode(),      //TODO: float provider, cannot contain 0.0
				b: NumberNode(),      //TODO: float provider, cannot contain 0.0
				height: NumberNode(), //TODO: float provider
			},
			'dawn:elliptical_pyramid': {
				a: NumberNode(),      //TODO: float provider, cannot contain 0.0
				b: NumberNode(),      //TODO: float provider, cannot contain 0.0
				height: NumberNode(), //TODO: float provider
			},
			'dawn:triangular_prism': {
				width: NumberNode(),  //TODO: float provider
				height: NumberNode(), //TODO: float provider, cannot contain 0.0
				depth: NumberNode(),  //TODO: float provider
			},
			'dawn:ellipsoid': {
				a: NumberNode(), //TODO: float provider, cannot contain 0.0
				b: NumberNode(), //TODO: float provider, cannot contain 0.0
				c: NumberNode(), //TODO: float provider, cannot contain 0.0
			},
			'dawn:hemi_ellipsoid': {
				a: NumberNode(), //TODO: float provider, cannot contain 0.0
				b: NumberNode(), //TODO: float provider, cannot contain 0.0
				c: NumberNode(), //TODO: float provider, cannot contain 0.0
			},
		},
	}, { context: `${ID}.shape`, disableSwitchContext: true }))

	schemas.register(`${ID}:shape_processor`, ObjectNode({
		type: StringNode({ validator: 'resource', params: { pool: `${ID}:shape_processor_type` as any } }),
		[Switch]: [{ push: 'type' }],
		[Case]: {
			'dawn:add': {
				shape: Reference(`${ID}:configured_shape`), //TODO: inline/reference/unconfigured
			},
			'dawn:subtract': {
				shape: Reference(`${ID}:configured_shape`), //TODO: inline/reference/unconfigured
			},
			'dawn:exclude': {
				shape: Reference(`${ID}:configured_shape`), //TODO: inline/reference/unconfigured
			},
			'dawn:intersect': {
				shape: Reference(`${ID}:configured_shape`), //TODO: inline/reference/unconfigured
			},
			'dawn:translate': {
				x: Opt(NumberNode()), //TODO: float provider
				y: Opt(NumberNode()), //TODO: float provider
				z: Opt(NumberNode()), //TODO: float provider
			},
			'dawn:rotate': {
				x: Opt(NumberNode()), //TODO: float provider
				y: Opt(NumberNode()), //TODO: float provider
				z: Opt(NumberNode()), //TODO: float provider
				degrees: Opt(BooleanNode()),
			},
			'dawn:scale': {
				x: Opt(NumberNode()), //TODO: float provider
				y: Opt(NumberNode()), //TODO: float provider
				z: Opt(NumberNode()), //TODO: float provider
			},
			'dawn:noise_translate': {
				magnitude: NumberNode(), //TODO: float provider
				seed: Opt(NumberNode({ integer: true })),
			},
		},
	}, { context: `${ID}.shape_processor`, disableSwitchContext: true }))

	schemas.register(`${ID}:configured_shape`, ObjectNode({
		shape: Reference(`${ID}:shape`),
		processors: ListNode(
			Reference(`${ID}:configured_shape_processor`), //TODO: inline/unconfigured
		),
	}, { context: `${ID}.configured_shape` }))

	schemas.register(`${ID}:configured_shape_processor`, ObjectNode({
		processor : Reference(`${ID}:shape_processor`),
		repeat: NumberNode({ integer: true, min: 0}), //TODO: int provider, must be positive
	}, { context: `${ID}.configured_shape_processor` }))

	collections.register('configured_shape', [
		'dawn:test',
	])
}

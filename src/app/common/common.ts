import type { CollectionRegistry, INode, ResourceType, SchemaRegistry } from '@mcschema/core'
import { ChoiceNode, ListNode, Reference as RawReference, StringNode as RawStringNode } from '@mcschema/core'

type NonTagResources = Exclude<ResourceType, `$tag/${string}`>

type TagConfig = {
	resource: NonTagResources
	inlineSchema?: string
}
export let Tag: (config: TagConfig) => INode

export function initCommonSchemas(schemas: SchemaRegistry, collections: CollectionRegistry) {
	const StringNode = RawStringNode.bind(undefined, collections)
	const Reference = RawReference.bind(undefined, schemas)

	Tag = (config: TagConfig) =>
		ChoiceNode(
			[
				{
					type: 'string',
					node: StringNode({ validator: 'resource', params: { pool: config.resource, allowTag: true } }),
					change: (v: unknown) => {
						if (Array.isArray(v) && typeof v[0] === 'string' && !v[0].startsWith('#')) {
							return v[0]
						}
						return undefined
					},
				},
				{
					type: 'list',
					node: ListNode(
						config.inlineSchema
							? ChoiceNode(
									[
										{
											type: 'string',
											node: StringNode({
												validator: 'resource',
												params: { pool: config.resource },
											}),
										},
										{
											type: 'object',
											node: Reference(config.inlineSchema),
										},
									],
									{ choiceContext: 'tag.list' }
							  )
							: StringNode({ validator: 'resource', params: { pool: config.resource } })
					),
					change: (v: unknown) => {
						if (typeof v === 'string' && !v.startsWith('#')) {
							return [v]
						}
						return ['']
					},
				},
			],
			{ choiceContext: 'tag' }
		)
}

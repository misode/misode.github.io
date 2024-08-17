import type { CollectionRegistry, INode, SchemaRegistry } from '@mcschema/core'
import { ChoiceNode, DataModel, Reference, StringNode } from '@mcschema/core'
import config from '../Config.js'
import { initPartners } from '../partners/index.js'
import { message } from '../Utils.js'
import { fetchData } from './DataFetcher.js'

export const VersionIds = ['1.15', '1.16', '1.17', '1.18', '1.18.2', '1.19', '1.19.3', '1.19.4', '1.20', '1.20.2', '1.20.3', '1.20.5', '1.21', '1.21.2'] as const
export type VersionId = typeof VersionIds[number]

export const DEFAULT_VERSION: VersionId = '1.21'

export type BlockStateRegistry = {
	[block: string]: {
		properties?: {
			[key: string]: string[],
		},
		default?: {
			[key: string]: string,
		},
	},
}

type VersionData = {
	collections: CollectionRegistry,
	schemas: SchemaRegistry,
	blockStates: BlockStateRegistry,
}
const Versions: Record<string, VersionData | Promise<VersionData>> = {}

type ModelData = {
	model: DataModel,
	version: VersionId,
}
const Models: Record<string, ModelData> = {}

const versionGetter: {
	[versionId in VersionId]: () => Promise<{
		getCollections: () => CollectionRegistry,
		getSchemas: (collections: CollectionRegistry) => SchemaRegistry,
	}>
} = {
	1.15: () => import('@mcschema/java-1.15'),
	1.16: () => import('@mcschema/java-1.16'),
	1.17: () => import('@mcschema/java-1.17'),
	1.18: () => import('@mcschema/java-1.18'),
	'1.18.2': () => import('@mcschema/java-1.18.2'),
	1.19: () => import('@mcschema/java-1.19'),
	'1.19.3': () => import('@mcschema/java-1.19.3'),
	'1.19.4': () => import('@mcschema/java-1.19.4'),
	'1.20': () => import('@mcschema/java-1.20'),
	'1.20.2': () => import('@mcschema/java-1.20.2'),
	'1.20.3': () => import('@mcschema/java-1.20.3'),
	'1.20.5': () => import('@mcschema/java-1.20.5'),
	1.21: () => import('@mcschema/java-1.21'),
	'1.21.2': () => import('@mcschema/java-1.21.2'),
}

export let CachedDecorator: INode<any>
export let CachedFeature: INode<any>
export let CachedCollections: CollectionRegistry
export let CachedSchemas: SchemaRegistry

async function getVersion(id: VersionId): Promise<VersionData> {
	if (!Versions[id]) {
		Versions[id] = (async () => {
			try {
				const mcschema = await versionGetter[id]()
				const collections = mcschema.getCollections()
				const blockStates: BlockStateRegistry = {}
				await fetchData(id, collections, blockStates)
				const schemas = mcschema.getSchemas(collections)
				initPartners(schemas, collections, id)
				Versions[id] = { collections, schemas, blockStates }
				return Versions[id]
			} catch (e) {
				throw new Error(`Cannot get version "${id}": ${message(e)}`)
			}
		})()
		return Versions[id]
	}
	return Versions[id]
}

export async function getModel(version: VersionId, id: string): Promise<DataModel> {
	if (!Models[id] || Models[id].version !== version) {
		const versionData = await getVersion(version)
		
		CachedDecorator = Reference(versionData.schemas, 'configured_decorator')
		CachedFeature = ChoiceNode([
			{
				type: 'string',
				node: StringNode(versionData.collections, { validator: 'resource', params: { pool: '$worldgen/configured_feature' } }),
			},
			{
				type: 'object',
				node: Reference(versionData.schemas, 'configured_feature'),
			},
		], { choiceContext: 'feature' })

		const schemaName = config.generators.find(g => g.id === id)?.schema
		if (!schemaName) {
			throw new Error(`Cannot find model ${id}`)
		}
		try {
			const schema = versionData.schemas.get(schemaName)
			const model = new DataModel(schema, { wrapLists: true })
			if (Models[id]) {
				model.reset(Models[id].model.data, false)
			} else {
				model.validate(true)
				model.history = [JSON.stringify(model.data)]
			}
			Models[id] = { model, version }
		} catch (e) {
			const err = new Error(`Cannot get generator "${id}" for version "${version}": ${message(e)}`)
			if (e instanceof Error) err.stack = e.stack
			throw err
		}
	}
	return Models[id].model
}

export async function getCollections(version: VersionId): Promise<CollectionRegistry> {
	const versionData = await getVersion(version)
	CachedCollections = versionData.collections
	return versionData.collections
}

export async function getBlockStates(version: VersionId): Promise<BlockStateRegistry> {
	const versionData = await getVersion(version)
	return versionData.blockStates
}

export async function getSchemas(version: VersionId): Promise<SchemaRegistry> {
	const versionData = await getVersion(version)
	CachedSchemas = versionData.schemas
	return versionData.schemas
}

export function checkVersion(versionId: string, minVersionId: string | undefined, maxVersionId?: string) {
	const version = config.versions.findIndex(v => v.id === versionId)
	const minVersion = minVersionId ? config.versions.findIndex(v => v.id === minVersionId) : 0
	const maxVersion = maxVersionId ? config.versions.findIndex(v => v.id === maxVersionId) : config.versions.length - 1
	return minVersion <= version && version <= maxVersion
}

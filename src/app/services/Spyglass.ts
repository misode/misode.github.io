import * as core from '@spyglassmc/core'
import { ErrorReporter } from '@spyglassmc/core'
import { BrowserExternals } from '@spyglassmc/core/lib/browser.js'
import type { McmetaSummary } from '@spyglassmc/java-edition/lib/dependency/index.js'
import { Fluids, ReleaseVersion, symbolRegistrar } from '@spyglassmc/java-edition/lib/dependency/index.js'
import * as jeJson from '@spyglassmc/java-edition/lib/json/index.js'
import * as jeMcf from '@spyglassmc/java-edition/lib/mcfunction/index.js'
import type { JsonFileNode, JsonStringNode } from '@spyglassmc/json'
import * as json from '@spyglassmc/json'
import { localize } from '@spyglassmc/locales'
import * as mcdoc from '@spyglassmc/mcdoc'
import * as nbt from '@spyglassmc/nbt'
import * as zip from '@zip.js/zip.js'
import type { Position, Range } from 'vscode-languageserver-textdocument'
import { TextDocument } from 'vscode-languageserver-textdocument'
import type { ConfigGenerator } from '../Config.js'
import siteConfig from '../Config.js'
import { computeIfAbsent, genPath, message } from '../Utils.js'
import type { VersionMeta } from './DataFetcher.js'
import { fetchBlockStates, fetchRegistries, fetchVanillaMcdoc, fetchVersions, getVersionChecksum } from './DataFetcher.js'
import type { VersionId } from './Versions.js'

const builtinMcdoc = `
use ::java::server::util::text::Text
use ::java::data::worldgen::dimension::Dimension

dispatch minecraft:resource[text_component] to Text

dispatch minecraft:resource[world] to struct WorldSettings {
	seed: #[random] long,
	/// Defaults to \`true\`.
	generate_features?: boolean,
	/// Defaults to \`false\`.
	bonus_chest?: boolean,
	legacy_custom_options?: string,
	dimensions: struct {
		[#[id="dimension"] string]: Dimension,
	},
}
`

interface ClientDocument {
	doc: TextDocument
	undoStack: string[]
	redoStack: string[]
}

export class SpyglassClient {
	public readonly externals: core.Externals = {
		...BrowserExternals,
		archive: {
			...BrowserExternals.archive,
			decompressBall,
		},
	}

	public readonly documents = new Map<string, ClientDocument>()

	public async createService(version: VersionId) {
		return SpyglassService.create(version, this)
	}
}

export class SpyglassService {
	private readonly watchers = new Map<string, ((docAndNode: core.DocAndNode) => void)[]>()

	private constructor (
		public readonly version: VersionId,
		private readonly service: core.Service,
		private readonly client: SpyglassClient,
	) {
		service.project.on('documentUpdated', (e) => {
			const uriWatchers = this.watchers.get(e.doc.uri) ?? []
			for (const handler of uriWatchers) {
				handler(e)
			}
		})
	}

	public getCheckerContext(doc: TextDocument, errors: core.LanguageError[]) {
		const err = new ErrorReporter()
		err.errors = errors
		return core.CheckerContext.create(this.service.project, { doc, err })
	}

	public async getFile(uri: string, emptyContent?: () => string) {
		let docAndNode = this.service.project.getClientManaged(uri)
		if (docAndNode === undefined) {
			const lang = core.fileUtil.extname(uri)?.slice(1) ?? 'txt'
			const content = await this.readFile(uri)
			this.service.project['bindUri'](uri)
			const doc = TextDocument.create(uri, lang, 1, content ?? (emptyContent ? emptyContent() : ''))
			await this.service.project.onDidOpen(doc.uri, doc.languageId, doc.version, doc.getText())
			docAndNode = await this.service.project.ensureClientManagedChecked(uri)
		}
		if (!docAndNode) {
			throw new Error(`[Spyglass#openFile] Cannot get doc and node: ${uri}`)
		}
		const document = this.client.documents.get(uri)
		if (document === undefined) {
			this.client.documents.set(uri, { doc: docAndNode.doc, undoStack: [], redoStack: [] })
		}
		return docAndNode
	}

	public async readFile(uri: string): Promise<string | undefined> {
		try {
			const buffer = await this.service.project.externals.fs.readFile(uri)
			return new TextDecoder().decode(buffer)
		} catch (e) {
			return undefined
		}
	}

	private async notifyChange(doc: TextDocument) {
		await this.service.project.onDidChange(doc.uri, [{ text: doc.getText() }], doc.version + 1)
		const docAndNode = this.service.project.getClientManaged(doc.uri)
		if (docAndNode) {
			this.service.project.emit('documentUpdated', docAndNode)
		}
		return docAndNode
	}

	public async writeFile(uri: string, content: string) {
		const document = this.client.documents.get(uri)
		if (document !== undefined) {
			document.undoStack.push(document.doc.getText())
			document.redoStack = []
			TextDocument.update(document.doc, [{ text: content }], document.doc.version + 1)
		}
		await this.service.project.externals.fs.writeFile(uri, content)
		if (document) {
			await this.notifyChange(document.doc)
		}
	}

	public async applyEdit(uri: string, edit: (node: core.FileNode<core.AstNode>) => void) {
		const document = this.client.documents.get(uri)
		if (document !== undefined) {
			document.undoStack.push(document.doc.getText())
			document.redoStack = []
			const docAndNode = this.service.project.getClientManaged(uri)
			if (!docAndNode) {
				throw new Error(`[Spyglass#openFile] Cannot get doc and node: ${uri}`)
			}
			edit(docAndNode.node)
			const newText = this.service.format(docAndNode.node, docAndNode.doc, 2, true)
			TextDocument.update(document.doc, [{ text: newText }], document.doc.version + 1)
			await this.service.project.externals.fs.writeFile(uri, document.doc.getText())
			await this.notifyChange(document.doc)
		}
	}

	public async undoEdit(uri: string) {
		const document = this.client.documents.get(uri)
		if (document === undefined) {
			throw new Error(`[Spyglass#undoEdits] Document doesn't exist: ${uri}`)
		}
		const lastUndo = document.undoStack.pop()
		if (lastUndo === undefined) {
			return
		}
		document.redoStack.push(document.doc.getText())
		TextDocument.update(document.doc, [{ text: lastUndo }], document.doc.version + 1)
		await this.service.project.externals.fs.writeFile(uri, document.doc.getText())
		await this.notifyChange(document.doc)
	}

	public async redoEdit(uri: string) {
		const document = this.client.documents.get(uri)
		if (document === undefined) {
			throw new Error(`[Spyglass#redoEdits] Document doesn't exist: ${uri}`)
		}
		const lastRedo = document.redoStack.pop()
		if (lastRedo === undefined) {
			return
		}
		document.undoStack.push(document.doc.getText())
		TextDocument.update(document.doc, [{ text: lastRedo }], document.doc.version + 1)
		await this.service.project.externals.fs.writeFile(uri, document.doc.getText())
		await this.notifyChange(document.doc)
	}

	public getUnsavedFileUri(gen: ConfigGenerator) {
		if (gen.id === 'pack_mcmeta') {
			return 'file:///project/pack.mcmeta'
		}
		return `file:///project/data/draft/${genPath(gen, this.version)}/unsaved.json`
	}

	public watchFile(uri: string, handler: (docAndNode: core.DocAndNode) => void) {
		const uriWatchers = computeIfAbsent(this.watchers, uri, () => [])
		uriWatchers.push(handler)
	}

	public unwatchFile(uri: string, handler: (docAndNode: core.DocAndNode) => void) {
		const uriWatchers = computeIfAbsent(this.watchers, uri, () => [])
		const index = uriWatchers.findIndex(w => w === handler)
		uriWatchers.splice(index, 1)
	}

	public static async create(versionId: VersionId, client: SpyglassClient) {
		const version = siteConfig.versions.find(v => v.id === versionId)!
		const logger = console
		const service = new core.Service({
			logger,
			profilers: new core.ProfilerFactory(logger, [
				'project#init',
				'project#ready',
			]),
			project: {
				cacheRoot: 'file:///cache/',
				projectRoots: ['file:///project/'],
				externals: client.externals,
				defaultConfig: core.ConfigService.merge(core.VanillaConfig, {
					env: {
						gameVersion: version.ref ?? version.id,
						dependencies: ['@vanilla-mcdoc', '@misode-mcdoc'],
						customResources: {
							text_component: {
								category: 'text_component',
							},
							world: {
								category: 'world',
							},
							// TODO: move these to the assets folder
							atlases: {
								category: 'atlas',
							},
							blockstates: {
								category: 'block_definition',
							},
							font: {
								category: 'font',
							},
							models: {
								category: 'model',
							},
							// Partner resources
							...Object.fromEntries(siteConfig.generators.filter(gen => gen.dependency).map(gen =>
								[gen.path, {
									category: gen.id,
								}]
							)),
						},
					},
					lint: {
						idOmitDefaultNamespace: false,
						undeclaredSymbol: [
							{
								if: { category: ['bossbar', 'objective', 'team'] },
								then: { declare: 'block' },
							},
							...core.VanillaConfig.lint.undeclaredSymbol as any[],
						],
					},
				}),
				initializers: [mcdoc.initialize, initialize],
			},
		})
		await service.project.ready()
		await service.project.cacheService.save()
		return new SpyglassService(versionId, service, client)
	}
}

async function decompressBall(buffer: Uint8Array, options?: { stripLevel?: number }): Promise<core.DecompressedFile[]> {
	const reader = new zip.ZipReader(new zip.BlobReader(new Blob([buffer])))
	const entries = await reader.getEntries()
	return await Promise.all(entries.map(async e => {
		const data = await e.getData?.(new zip.Uint8ArrayWriter())
		const path = options?.stripLevel === 1 ? e.filename.substring(e.filename.indexOf('/') + 1) : e.filename
		const type = e.directory ? 'dir' : 'file'
		return { data, path, mtime: '', type, mode: 0 }
	}))
}

async function compressBall(files: [string, string][]): Promise<Uint8Array> {
	const writer = new zip.ZipWriter(new zip.Uint8ArrayWriter())
	await Promise.all(files.map(async ([name, data]) => {
		await writer.add(name, new zip.TextReader(data))
	}))
	return await writer.close()
}

const initialize: core.ProjectInitializer = async (ctx) => {
	const { config, logger, meta, externals, cacheRoot } = ctx

	meta.registerDependencyProvider('@vanilla-mcdoc', async () => {
		const uri: string = new core.Uri('downloads/vanilla-mcdoc.tar.gz', cacheRoot).toString()
		const buffer = await fetchVanillaMcdoc()
		await core.fileUtil.writeFile(externals, uri, new Uint8Array(buffer))
		return { info: { startDepth: 1 }, uri }
	})

	meta.registerDependencyProvider('@misode-mcdoc', async () => {
		const uri: string = new core.Uri('downloads/misode-mcdoc.tar.gz', cacheRoot).toString()
		const buffer = await compressBall([['builtin.mcdoc', builtinMcdoc]])
		await core.fileUtil.writeFile(externals, uri, buffer)
		return { uri }
	})

	const versions = await fetchVersions()
	const release = config.env.gameVersion as ReleaseVersion
	const version = siteConfig.versions.find(v => {
		return v.ref ? v.ref === release : v.id === release
	})
	if (version === undefined) {
		logger.error(`[initialize] Failed finding game version matching ${release}.`)
		return
	}

	const summary: McmetaSummary = {
		registries: Object.fromEntries((await fetchRegistries(version.id)).entries()),
		blocks: Object.fromEntries([...(await fetchBlockStates(version.id)).entries()]
			.map(([id, data]) => [id, [data.properties, data.default]])),
		fluids: Fluids,
		commands: { type: 'root', children: {} },
	}

	meta.registerSymbolRegistrar('mcmeta-summary', {
		checksum: getVersionChecksum(version.id),
		registrar: symbolRegistrar(summary),
	})

	registerAttributes(meta, release, versions)

	json.initialize(ctx)
	jeJson.initialize(ctx)
	jeMcf.initialize(ctx, summary.commands, release)
	nbt.initialize(ctx)

	// Until spyglass registers these correctly
	meta.registerFormatter<JsonFileNode>('json:file', (node, ctx) => {
		return ctx.meta.getFormatter(node.children[0].type)(node.children[0], ctx)
	})
	meta.registerFormatter<JsonStringNode>('json:string', (node) => {
		return JSON.stringify(node.value)
	})
	meta.registerFormatter<core.ErrorNode>('error', () => {
		return ''
	})

	return { loadedVersion: release }
}

// Duplicate these from spyglass for now, until they are exported separately
function registerAttributes(meta: core.MetaRegistry, release: ReleaseVersion, versions: VersionMeta[]) {
	mcdoc.runtime.registerAttribute(meta, 'since', mcdoc.runtime.attribute.validator.string, {
		filterElement: (config, ctx) => {
			if (!config.startsWith('1.')) {
				ctx.logger.warn(`Invalid mcdoc attribute for "since": ${config}`)
				return true
			}
			return ReleaseVersion.cmp(release, config as ReleaseVersion) >= 0
		},
	})
	mcdoc.runtime.registerAttribute(meta, 'until', mcdoc.runtime.attribute.validator.string, {
		filterElement: (config, ctx) => {
			if (!config.startsWith('1.')) {
				ctx.logger.warn(`Invalid mcdoc attribute for "until": ${config}`)
				return true
			}
			return ReleaseVersion.cmp(release, config as ReleaseVersion) < 0
		},
	})
	mcdoc.runtime.registerAttribute(
		meta,
		'deprecated',
		mcdoc.runtime.attribute.validator.optional(mcdoc.runtime.attribute.validator.string),
		{
			mapField: (config, field, ctx) => {
				if (config === undefined) {
					return { ...field, deprecated: true }
				}
				if (!config.startsWith('1.')) {
					ctx.logger.warn(`Invalid mcdoc attribute for "deprecated": ${config}`)
					return field
				}
				if (ReleaseVersion.cmp(release, config as ReleaseVersion) >= 0) {
					return { ...field, deprecated: true }
				}
				return field
			},
		},
	)
	const maxPackFormat = versions[0].data_pack_version
	mcdoc.runtime.registerAttribute(meta, 'pack_format', () => undefined, {
		checker: (_, typeDef) => {
			if (typeDef.kind !== 'literal' || typeof typeDef.value.value !== 'number') {
				return undefined
			}
			const target = typeDef.value.value
			return (node, ctx) => {
				if (target > maxPackFormat) {
					ctx.err.report(
						localize('expected', localize('mcdoc.runtime.checker.range.number', localize('mcdoc.runtime.checker.range.right-inclusive', maxPackFormat))),
						node,
						3,
					)
				}
			}
		},
	})

	// Until spyglass implements this attribute itself
	mcdoc.runtime.registerAttribute(meta, 'regex_pattern', () => undefined, {
		checker: (_, typeDef) => {
			if (typeDef.kind !== 'literal' || typeDef.value.kind !== 'string') {
				return undefined
			}
			const pattern = typeDef.value.value
			return (node, ctx) => {
				try {
					RegExp(pattern)
				} catch (e) {
					ctx.err.report(message(e), node, 2)
				}
			}
		},
	})
}

function getLsPosition(offset: number, doc: TextDocument): Position {
	return doc.positionAt(offset)
}

export function getLsRange(range: core.Range, doc: TextDocument): Range {
	return { start: getLsPosition(range.start, doc), end: getLsPosition(range.end, doc) }
}

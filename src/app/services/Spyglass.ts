import * as core from '@spyglassmc/core'
import { BrowserExternals } from '@spyglassmc/core/lib/browser.js'
import * as je from '@spyglassmc/java-edition'
import { ReleaseVersion } from '@spyglassmc/java-edition/lib/dependency/index.js'
import * as json from '@spyglassmc/json'
import { localize } from '@spyglassmc/locales'
import * as mcdoc from '@spyglassmc/mcdoc'
import * as nbt from '@spyglassmc/nbt'
import * as zip from '@zip.js/zip.js'
import sparkmd5 from 'spark-md5'
import { TextDocument } from 'vscode-languageserver-textdocument'
import type { ConfigGenerator } from '../Config.js'
import siteConfig from '../Config.js'
import { computeIfAbsent, genPath } from '../Utils.js'
import type { VanillaMcdocSymbols, VersionMeta } from './DataFetcher.js'
import { fetchBlockStates, fetchRegistries, fetchVanillaMcdoc, fetchVersions, getVersionChecksum } from './DataFetcher.js'
import { IndexedDbFileSystem } from './FileSystem.js'
import type { VersionId } from './Versions.js'

export const CACHE_URI = 'file:///cache/'
export const ROOT_URI = 'file:///root/'
export const DEPENDENCY_URI = `${ROOT_URI}dependency/`
export const UNSAVED_URI = `${ROOT_URI}unsaved/`
export const PROJECTS_URI = `${ROOT_URI}projects/`
export const DRAFTS_URI = `${ROOT_URI}drafts/`

const INITIAL_DIRS = [CACHE_URI, ROOT_URI, DEPENDENCY_URI, UNSAVED_URI, PROJECTS_URI, DRAFTS_URI]

const builtinMcdoc = `
use ::java::util::text::Text
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
	public static readonly FS = new IndexedDbFileSystem()
	public readonly fs = SpyglassClient.FS
	public readonly externals: core.Externals = {
		...BrowserExternals,
		archive: {
			...BrowserExternals.archive,
			decompressBall,
		},
		crypto: {
			// Swap the web crypto sha1 for an md5 implementation, which is about twice as fast
			getSha1: async (data: string | Uint8Array) => {
				if (typeof data === 'string') {
					data = new TextEncoder().encode(data)
				}
				return sparkmd5.ArrayBuffer.hash(data)
			},
		},
		fs: SpyglassClient.FS,
	}

	public readonly documents = new Map<string, ClientDocument>()

	public async createService(version: VersionId) {
		return SpyglassService.create(version, this)
	}
}

export class SpyglassService {
	private static activeServiceId = 1
	private readonly fileWatchers = new Map<string, ((docAndNode: core.DocAndNode) => void)[]>()
	private readonly treeWatchers: { prefix: string, handler: (uris: string[]) => void }[] = []

	private constructor (
		public readonly version: VersionId,
		private readonly service: core.Service,
		private readonly client: SpyglassClient,
	) {
		service.project.on('documentUpdated', (e) => {
			const uriWatchers = this.fileWatchers.get(e.doc.uri) ?? []
			for (const handler of uriWatchers) {
				handler(e)
			}
		})
		let treeWatcherTask = Promise.resolve()
		let hasPendingTask = false
		const treeWatcher = () => {
			hasPendingTask = true
			// Wait for previous task to finish, then re-run once after 5 ms
			treeWatcherTask = treeWatcherTask.finally(async () => {
				if (!hasPendingTask) {
					return
				}
				hasPendingTask = false
				await new Promise((res) => setTimeout(res, 5))
				await Promise.all(this.treeWatchers.map(async ({ prefix, handler }) => {
					const entries = await client.fs.readdir(prefix)
					handler(entries.flatMap(e => {
						return e.isFile() ? [e.name.slice(prefix.length)] : []
					}))
				}))
			})
		}
		service.project.on('fileCreated', treeWatcher)
		service.project.on('fileDeleted', treeWatcher)
	}

	public getCheckerContext(doc?: TextDocument, errors?: core.LanguageError[]) {
		if (!doc) {
			doc = TextDocument.create('file:///unknown.json', 'json', 1, '')
		}
		const err = new core.ErrorReporter()
		if (errors) {
			err.errors = errors
		}
		return core.CheckerContext.create(this.service.project, { doc, err })
	}

	public dissectUri(uri: string) {
		return je.binder.dissectUri(uri, this.getCheckerContext(TextDocument.create(uri, 'json', 1, '')))
	}

	public async openFile(uri: string) {
		const lang = core.fileUtil.extname(uri)?.slice(1) ?? 'txt'
		const content = await this.readFile(uri)
		if (!content) {
			return undefined
		}
		await this.service.project.onDidOpen(uri, lang, 1, content)
		const docAndNode = await this.service.project.ensureClientManagedChecked(uri)
		if (!docAndNode) {
			return undefined
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
		const docAndNode = this.service.project.getClientManaged(doc.uri)
		if (docAndNode) {
			await this.service.project.onDidChange(doc.uri, [{ text: doc.getText() }], doc.version + 1)
		} else {
			await this.service.project.onDidOpen(doc.uri, doc.languageId, doc.version, doc.getText())
		}
		await this.service.project.ensureClientManagedChecked(doc.uri)
	}

	public async writeFile(uri: string, content: string) {
		const document = this.client.documents.get(uri)
		if (document) {
			document.undoStack.push(document.doc.getText())
			document.redoStack = []
			TextDocument.update(document.doc, [{ text: content }], document.doc.version + 1)
		}
		await this.service.project.externals.fs.writeFile(uri, content)
		if (document) {
			await this.notifyChange(document.doc)
		}
	}

	public async renameFile(oldUri: string, newUri: string) {
		const content = await this.readFile(oldUri)
		if (!content) {
			throw new Error(`Cannot rename nonexistent file ${oldUri}`)
		}
		await this.service.project.externals.fs.writeFile(newUri, content)
		await this.service.project.externals.fs.unlink(oldUri)
		const d = this.client.documents.get(oldUri)
		if (d) {
			const doc = TextDocument.create(newUri, d.doc.languageId, d.doc.version, d.doc.getText())
			this.client.documents.set(newUri, { ...d, doc })
			this.client.documents.delete(oldUri)
		}
	}

	public async applyEdit(uri: string, edit: (node: core.FileNode<core.AstNode>) => void) {
		const document = this.client.documents.get(uri)
		if (document !== undefined) {
			document.undoStack.push(document.doc.getText())
			document.redoStack = []
			const docAndNode = this.service.project.getClientManaged(uri)
			if (!docAndNode) {
				throw new Error(`[Spyglass#applyEdit] Cannot get doc and node: ${uri}`)
			}
			edit(docAndNode.node)
			const newText = this.service.format(docAndNode.node, docAndNode.doc, 2, true)
			TextDocument.update(document.doc, [{ text: newText }], document.doc.version + 1)
			await this.service.project.externals.fs.writeFile(uri, document.doc.getText())
			await this.notifyChange(document.doc)
		}
	}

	public formatNode(node: json.JsonNode, uri: string) {
		const formatter = this.service.project.meta.getFormatter(node.type)
		const doc = TextDocument.create(uri, 'json', 1, '')
		const ctx = core.FormatterContext.create(this.service.project, { doc, tabSize: 2, insertSpaces: true })
		return formatter(node, ctx)
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
			return `${UNSAVED_URI}pack.mcmeta`
		}
		const pack = gen.tags?.includes('assets') ? 'assets' : 'data'
		return `${UNSAVED_URI}${pack}/draft/${genPath(gen, this.version)}/draft${gen.ext ?? '.json'}`
	}

	public watchFile(uri: string, handler: (docAndNode: core.DocAndNode) => void) {
		const uriWatchers = computeIfAbsent(this.fileWatchers, uri, () => [])
		uriWatchers.push(handler)
	}

	public unwatchFile(uri: string, handler: (docAndNode: core.DocAndNode) => void) {
		const uriWatchers = computeIfAbsent(this.fileWatchers, uri, () => [])
		const index = uriWatchers.findIndex(w => w === handler)
		uriWatchers.splice(index, 1)
	}

	public watchTree(prefix: string, handler: (uris: string[]) => void) {
		this.treeWatchers.push({ prefix, handler })
	}

	public unwatchTree(prefix: string, handler: (uris: string[]) => void) {
		const index = this.treeWatchers.findIndex(w => w.prefix === prefix && w.handler === handler)
		this.treeWatchers.splice(index, 1)
	}

	public static async create(versionId: VersionId, client: SpyglassClient) {
		SpyglassService.activeServiceId += 1
		const currentServiceId = SpyglassService.activeServiceId
		await Promise.allSettled(INITIAL_DIRS.map(async uri => client.externals.fs.mkdir(uri)))
		const version = siteConfig.versions.find(v => v.id === versionId)!
		const logger = console
		const service = new core.Service({
			logger,
			profilers: new core.ProfilerFactory(logger, [
				'cache#load',
				'cache#save',
				'project#init',
				'project#ready',
				'project#ready#bind',
			]),
			project: {
				cacheRoot: CACHE_URI,
				projectRoots: [ROOT_URI],
				externals: client.externals,
				defaultConfig: core.ConfigService.merge(core.VanillaConfig, {
					env: {
						gameVersion: version.dynamic ? version.id : version.ref,
						dependencies: ['@misode-mcdoc'],
						customResources: {
							text_component: {
								category: 'text_component',
							},
							world: {
								category: 'world',
							},
							// Partner resources
							...Object.fromEntries(siteConfig.generators.filter(gen => gen.dependency).map(gen =>
								[gen.path ?? gen.id, {
									category: gen.id,
									pack: gen.tags?.includes('assets') ? 'assets' : 'data',
								}]
							)),
						},
					},
					lint: {
						idOmitDefaultNamespace: false,
						undeclaredSymbol: [
							{
								if: { category: ['bossbar', 'objective', 'team', 'shader'] },
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
		setTimeout(() => {
			if (currentServiceId === SpyglassService.activeServiceId) {
				service.project.cacheService.save()
			} else {
				logger.info('[SpyglassService] Skipped saving the cache because another service is active')
			}
		}, 10_000)
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

	const vanillaMcdoc = await fetchVanillaMcdoc()
	meta.registerSymbolRegistrar('vanilla-mcdoc', {
		checksum: vanillaMcdoc.ref,
		registrar: vanillaMcdocRegistrar(vanillaMcdoc),
	})

	meta.registerDependencyProvider('@misode-mcdoc', async () => {
		const uri: string = new core.Uri('downloads/misode-mcdoc.tar.gz', cacheRoot).toString()
		const buffer = await compressBall([['builtin.mcdoc', builtinMcdoc]])
		await core.fileUtil.writeFile(externals, uri, buffer)
		return { uri }
	})

	meta.registerUriBinder(je.binder.uriBinder)

	const versions = await fetchVersions()
	const release = config.env.gameVersion as ReleaseVersion
	const version = siteConfig.versions.find(v => {
		return v.dynamic ? v.id === release : v.ref === release
	})
	if (version === undefined) {
		logger.error(`[initialize] Failed finding game version matching ${release}.`)
		return
	}

	const summary: je.dependency.McmetaSummary = {
		registries: Object.fromEntries((await fetchRegistries(version.id)).entries()),
		blocks: Object.fromEntries([...(await fetchBlockStates(version.id)).entries()]
			.map(([id, data]) => [id, data])),
		fluids: je.dependency.Fluids,
		commands: { type: 'root', children: {} },
	}

	const versionChecksum = getVersionChecksum(version.id)

	meta.registerSymbolRegistrar('mcmeta-summary', {
		checksum: versionChecksum,
		registrar: je.dependency.symbolRegistrar(summary, release),
	})

	registerAttributes(meta, release, versions)

	json.getInitializer()(ctx)
	je.json.initialize(ctx)
	je.mcf.initialize(ctx, summary.commands, release)
	nbt.initialize(ctx)

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
}

const VanillaMcdocUri = 'mcdoc://vanilla-mcdoc/symbols.json'

function vanillaMcdocRegistrar(vanillaMcdoc: VanillaMcdocSymbols): core.SymbolRegistrar {
	return (symbols) => {
		const start = performance.now()
		for (const [id, typeDef] of Object.entries(vanillaMcdoc.mcdoc)) {
			symbols.query(VanillaMcdocUri, 'mcdoc', id).enter({
				data: { data: { typeDef } },
				usage: { type: 'declaration' },
			})
		}
		for (const [dispatcher, ids] of Object.entries(vanillaMcdoc['mcdoc/dispatcher'])) {
			symbols.query(VanillaMcdocUri, 'mcdoc/dispatcher', dispatcher)
				.enter({ usage: { type: 'declaration' } })
				.onEach(Object.entries(ids), ([id, typeDef], query) => {
					query.member(id, (memberQuery) => {
						memberQuery.enter({
							data: { data: { typeDef } },
							usage: { type: 'declaration' },
						})
					})
				})
		}
		const duration = performance.now() - start
		console.log(`[vanillaMcdocRegistrar] Done in ${duration}ms`)
	}
}

import * as core from '@spyglassmc/core'
import { BrowserExternals } from '@spyglassmc/core/lib/browser.js'
import type { McmetaSummary } from '@spyglassmc/java-edition/lib/dependency/index.js'
import { Fluids, ReleaseVersion, symbolRegistrar } from '@spyglassmc/java-edition/lib/dependency/index.js'
import * as jeJson from '@spyglassmc/java-edition/lib/json/index.js'
import * as jeMcf from '@spyglassmc/java-edition/lib/mcfunction/index.js'
import * as json from '@spyglassmc/json'
import { localize } from '@spyglassmc/locales'
import * as mcdoc from '@spyglassmc/mcdoc'
import * as nbt from '@spyglassmc/nbt'
import * as zip from '@zip.js/zip.js'
import type { TextEdit } from 'vscode-languageserver-textdocument'
import { TextDocument } from 'vscode-languageserver-textdocument'
import type { ConfigGenerator, ConfigVersion } from '../Config.js'
import siteConfig from '../Config.js'
import { computeIfAbsent, genPath } from '../Utils.js'
import { fetchBlockStates, fetchRegistries, fetchVanillaMcdoc, getVersionChecksum } from './DataFetcher.js'
import type { VersionId } from './Versions.js'

interface DocumentData {
	doc: TextDocument
	undoStack: { edits: TextEdit[] }[]
	redoStack: { edits: TextEdit[] }[]
}

export class Spyglass {
	private static readonly LOGGER: core.Logger = console
	private static readonly EXTERNALS: core.Externals = {
		...BrowserExternals,
		archive: {
			...BrowserExternals.archive,
			decompressBall,
		},
	}

	private readonly instances = new Map<VersionId, Promise<core.Service>>()
	private readonly documents = new Map<string, DocumentData>()
	private readonly watchers = new Map<string, ((docAndNode: core.DocAndNode) => void)[]>()

	public async getFile(version: VersionId, uri: string, emptyContent?: () => string) {
		const service = await this.getService(version)
		const document = this.documents.get(uri)
		let docAndNode: core.DocAndNode | undefined
		if (document === undefined) {
			let doc: TextDocument
			try {
				const buffer = await Spyglass.EXTERNALS.fs.readFile(uri)
				const content = new TextDecoder().decode(buffer)
				doc = TextDocument.create(uri, 'json', 1, content)
				Spyglass.LOGGER.info(`[Spyglass#openFile] Opening file with content from fs: ${uri}`)
			} catch (e) {
				doc = TextDocument.create(uri, 'json', 1, emptyContent ? emptyContent() : '')
				Spyglass.LOGGER.info(`[Spyglass#openFile] Opening empty file: ${uri}`)
			}
			this.documents.set(uri, { doc, undoStack: [], redoStack: [] })
			await service.project.onDidOpen(doc.uri, doc.languageId, doc.version, doc.getText())
			docAndNode = await service.project.ensureClientManagedChecked(uri)
		} else {
			docAndNode = service.project.getClientManaged(uri)
			Spyglass.LOGGER.info(`[Spyglass#openFile] Opening already open file: ${uri}`)
		}
		if (!docAndNode) {
			throw new Error(`[Spyglass#openFile] Cannot get doc and node: ${uri}`)
		}
		return docAndNode
	}

	public async writeFile(versionId: VersionId, uri: string, content: string) {
		await Spyglass.EXTERNALS.fs.writeFile(uri, content)
		Spyglass.LOGGER.info(`[Spyglass#writeFile] Writing file: ${uri} ${content.substring(0, 50)}`)
		const doc = this.documents.get(uri)?.doc
		if (doc !== undefined) {
			const service = await this.getService(versionId)
			await service.project.onDidChange(doc.uri, [{ text: content }], doc.version + 1)
			const docAndNode = service.project.getClientManaged(doc.uri)
			if (docAndNode) {
				service.project.emit('documentUpdated', docAndNode)
			}
		}
	}

	public getFileContents(_uri: string): string | undefined {
		return undefined // TODO
	}

	public getUnsavedFileUri(versionId: VersionId, gen: ConfigGenerator) {
		if (gen.id === 'pack_mcmeta') {
			return 'file:///project/pack.mcmeta'
		}
		return `file:///project/data/draft/${genPath(gen, versionId)}/unsaved.json`
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

	private async getService(versionId: VersionId) {
		const instance = this.instances.get(versionId)
		if (instance) {
			return instance
		}
		const promise = (async () => {
			const version = siteConfig.versions.find(v => v.id === versionId)!
			const service = new core.Service({
				logger: Spyglass.LOGGER,
				profilers: new core.ProfilerFactory(Spyglass.LOGGER, [
					'project#init',
					'project#ready',
				]),
				project: {
					cacheRoot: 'file:///cache/',
					projectRoots: ['file:///project/'],
					externals: Spyglass.EXTERNALS,
					defaultConfig: core.ConfigService.merge(core.VanillaConfig, {
						env: {
							gameVersion: version.ref ?? version.id,
							dependencies: ['@vanilla-mcdoc'],
						},
					}),
					initializers: [mcdoc.initialize, initialize],
				},
			})
			await service.project.ready()
			await service.project.cacheService.save()
			service.project.on('documentUpdated', (e) => {
				const uriWatchers = this.watchers.get(e.doc.uri) ?? []
				for (const handler of uriWatchers) {
					handler(e)
				}
			})
			return service
		})()
		this.instances.set(versionId, promise)
		return promise
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

const initialize: core.ProjectInitializer = async (ctx) => {
	const { config, logger, meta, externals, cacheRoot } = ctx

	meta.registerDependencyProvider('@vanilla-mcdoc', async () => {
		const uri: string = new core.Uri('downloads/vanilla-mcdoc.tar.gz', cacheRoot).toString()
		const buffer = await fetchVanillaMcdoc()
		await core.fileUtil.writeFile(externals, uri, new Uint8Array(buffer))
		return { info: { startDepth: 1 }, uri }
	})

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

	registerAttributes(meta, release)

	json.initialize(ctx)
	jeJson.initialize(ctx)
	jeMcf.initialize(ctx, summary.commands, release)
	nbt.initialize(ctx)

	return { loadedVersion: release }
}

// Duplicate these from spyglass for now, until they are exported separately
function registerAttributes(meta: core.MetaRegistry, release: ReleaseVersion) {
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
	const packFormats = new Map<number, ConfigVersion>()
	for (const version of siteConfig.versions) {
		packFormats.set(version.pack_format, version)
	}
	mcdoc.runtime.registerAttribute(meta, 'pack_format', () => undefined, {
		checker: (_, typeDef) => {
			if (typeDef.kind !== 'literal' || typeof typeDef.value.value !== 'number') {
				return undefined
			}
			const target = typeDef.value.value
			return (node, ctx) => {
				const targetVersion = packFormats.get(target)
				if (!targetVersion) {
					ctx.err.report(
						localize('java-edition.pack-format.unsupported', target),
						node,
						core.ErrorSeverity.Warning,
					)
				} else if (targetVersion.id !== release) {
					ctx.err.report(
						localize('java-edition.pack-format.not-loaded', target, release),
						node,
						core.ErrorSeverity.Warning,
					)
				}
			}
		},
		numericCompleter: (_, ctx) => {
			return [...packFormats.values()].map((v, i) => ({
				range: core.Range.create(ctx.offset),
				label: `${v.pack_format}`,
				labelSuffix: ` (${v.id})`,
				sortText: `${i}`.padStart(4, '0'),
			} as core.CompletionItem))
		},
	})
}

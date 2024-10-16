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
import type { ConfigGenerator, ConfigVersion } from '../Config.js'
import siteConfig from '../Config.js'
import { genPath } from '../Utils.js'
import { fetchBlockStates, fetchRegistries, fetchVanillaMcdoc, getVersionChecksum } from './DataFetcher.js'
import type { VersionId } from './Versions.js'

export class Spyglass {
	private static readonly INSTANCES = new Map<VersionId, Promise<Spyglass>>()

	private constructor(
		private readonly service: core.Service,
		private readonly version: ConfigVersion,
	) {}

	public async setFileContents(uri: string, contents: string) {
		await this.service.project.onDidOpen(uri, 'json', 1, contents)
		const docAndNode = await this.service.project.ensureClientManagedChecked(uri)
		if (!docAndNode) {
			throw new Error('[Spyglass setFileContents] Cannot get doc and node')
		}
		return docAndNode
	}

	public getFile(uri: string): Partial<core.DocAndNode> {
		return this.service.project.getClientManaged(uri) ?? {}
	}

	public getUnsavedFileUri(gen: ConfigGenerator) {
		return `file:project/data/draft/${genPath(gen, this.version.id)}/unsaved.json`
	}

	public static async initialize(versionId: VersionId) {
		const instance = this.INSTANCES.get(versionId)
		if (instance) {
			return instance
		}
		const promise = (async () => {
			const version = siteConfig.versions.find(v => v.id === versionId)!
			const service = new core.Service({
				logger: console,
				profilers: new core.ProfilerFactory(console, [
					'project#init',
					'project#ready',
				]),
				project: {
					cacheRoot: 'file:cache/',
					projectRoots: ['file:project/'],
					externals: {
						...BrowserExternals,
						archive: {
							...BrowserExternals.archive,
							decompressBall,
						},
					},
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
			return new Spyglass(service, version)
		})()
		this.INSTANCES.set(versionId, promise)
		return promise
	}
}

const decompressBall: core.Externals['archive']['decompressBall'] = async (buffer, options) => {
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

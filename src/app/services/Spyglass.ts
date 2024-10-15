import * as core from '@spyglassmc/core'
import { BrowserExternals } from '@spyglassmc/core/lib/browser.js'
import * as mcdoc from '@spyglassmc/mcdoc'
import * as zip from '@zip.js/zip.js'
import { fetchVanillaMcdoc } from './index.js'

const externals: core.Externals = {
	...BrowserExternals,
	archive: {
		...BrowserExternals.archive,
		async decompressBall(buffer, { stripLevel } = {}) {
			const reader = new zip.ZipReader(new zip.BlobReader(new Blob([buffer])))
			const entries = await reader.getEntries()
			return await Promise.all(entries.map(async e => {
				const data = await e.getData?.(new zip.Uint8ArrayWriter())
				const path = stripLevel === 1 ? e.filename.substring(e.filename.indexOf('/') + 1) : e.filename
				const type = e.directory ? 'dir' : 'file'
				return { data, path, mtime: '', type, mode: 0 }
			}))
		},
	},
}

export async function setupSpyglass() {
	const logger: core.Logger = console
	const profilers = new core.ProfilerFactory(logger, [
		'project#init',
		'project#ready',
		'misode#setup',
	])
	const profiler = profilers.get('misode#setup')
	const service = new core.Service({
		logger,
		profilers,
		project: {
			cacheRoot: 'file:cache/',
			projectRoots: ['file:project/'],
			externals: externals,
			defaultConfig: core.ConfigService.merge(core.VanillaConfig, {
				env: { dependencies: ['@vanilla-mcdoc'] },
			}),
			initializers: [mcdoc.initialize, initialize],
		},
	})
	await service.project.ready()
	profiler.task('Project ready')
	await service.project.cacheService.save()
	profiler.task('Save cache')
	profiler.finalize()

	service.logger.info(service.project.symbols.global)
}

const initialize: core.ProjectInitializer = async (ctx) => {
	const { meta, externals, cacheRoot } = ctx

	meta.registerDependencyProvider('@vanilla-mcdoc', async () => {
		const uri: string = new core.Uri('downloads/vanilla-mcdoc.tar.gz', cacheRoot).toString()
		const buffer = await fetchVanillaMcdoc()
		await core.fileUtil.writeFile(externals, uri, new Uint8Array(buffer))
		return { info: { startDepth: 1 }, uri }
	})
}

import { DataModel, Path } from '@mcschema/core'
import { route } from 'preact-router'
import { useCallback, useEffect, useErrorBoundary, useMemo, useRef, useState } from 'preact/hooks'
import { Analytics } from '../../Analytics.js'
import type { ConfigGenerator } from '../../Config.js'
import config from '../../Config.js'
import { DRAFT_PROJECT, useLocale, useProject, useVersion } from '../../contexts/index.js'
import { AsyncCancel, useActiveTimeout, useAsync, useModel, useSearchParam } from '../../hooks/index.js'
import { getOutput } from '../../schema/transformOutput.js'
import type { VersionId } from '../../services/index.js'
import { checkVersion, fetchPreset, getBlockStates, getCollections, getModel, getSnippet, shareSnippet } from '../../services/index.js'
import { Store } from '../../Store.js'
import { cleanUrl, deepEqual } from '../../Utils.js'
import { Ad, Btn, BtnMenu, ErrorPanel, FileCreation, FileRenaming, Footer, HasPreview, Octicon, PreviewPanel, ProjectCreation, ProjectDeletion, ProjectPanel, SearchList, SourcePanel, TextInput, Tree, VersionSwitcher } from '../index.js'

export const SHARE_KEY = 'share'

interface Props {
	gen: ConfigGenerator
	allowedVersions: VersionId[],
}
export function SchemaGenerator({ gen, allowedVersions }: Props) {
	const { locale } = useLocale()
	const { version, changeVersion, changeTargetVersion } = useVersion()
	const { projects, project, file, updateProject, updateFile } = useProject()
	const [error, setError] = useState<Error | string | null>(null)
	const [errorBoundary, errorRetry] = useErrorBoundary()
	if (errorBoundary) {
		errorBoundary.message = `Something went wrong rendering the generator: ${errorBoundary.message}`
		return <main><ErrorPanel error={errorBoundary} onDismiss={errorRetry} /></main>
	}

	useEffect(() => Store.visitGenerator(gen.id), [gen.id])

	const [currentPreset, setCurrentPreset] = useSearchParam('preset')
	const [sharedSnippetId, setSharedSnippetId] = useSearchParam(SHARE_KEY)
	const ignoreChange = useRef(false)
	const backup = useMemo(() => Store.getBackup(gen.id), [gen.id])

	const loadBackup = () => {
		if (backup !== undefined) {
			model?.reset(DataModel.wrapLists(backup), false)
		}
	}

	const { value } = useAsync(async () => {
		let data: unknown = undefined
		if (currentPreset && sharedSnippetId) {
			setSharedSnippetId(undefined)
			return AsyncCancel
		}
		if (currentPreset) {
			data = await loadPreset(currentPreset)
		} else if (sharedSnippetId) {
			const snippet = await getSnippet(sharedSnippetId)
			let cancel = false
			if (snippet.version && snippet.version !== version) {
				changeVersion(snippet.version, false)
				cancel = true
			}
			if (snippet.type && snippet.type !== gen.id) {
				const snippetGen = config.generators.find(g => g.id === snippet.type)
				if (snippetGen) {
					route(`${cleanUrl(snippetGen.url)}?${SHARE_KEY}=${snippet.id}`)
					cancel = true
				}
			}
			if (cancel) {
				return AsyncCancel
			}
			if (snippet.show_preview && !previewShown) {
				setPreviewShown(true)
				setSourceShown(false)
			}
			Analytics.openSnippet(gen.id, sharedSnippetId, version)
			data = snippet.data
		} else if (file) {
			if (project.version && project.version !== version) {
				changeVersion(project.version, false)
				return AsyncCancel
			}
			data = file.data
		}
		const [model, blockStates] = await Promise.all([
			getModel(version, gen.id),
			getBlockStates(version),
		])
		if (data) {
			ignoreChange.current = true
			model.reset(DataModel.wrapLists(data), false)
		}
		Analytics.setGenerator(gen.id)
		return { model, blockStates }
	}, [gen.id, version, sharedSnippetId, currentPreset, project.name, file?.id])

	const model = value?.model
	const blockStates = value?.blockStates

	useModel(model, model => {
		if (!ignoreChange.current) {
			setCurrentPreset(undefined, true)
			setSharedSnippetId(undefined, true)
		}
		if (file && model && blockStates) {
			const data = getOutput(model, blockStates)
			updateFile(gen.id, file.id, { id: file.id, data })
		}
		ignoreChange.current = false
		Store.setBackup(gen.id, DataModel.unwrapLists(model.data))
		setError(null)
	}, [gen.id, setCurrentPreset, setSharedSnippetId, blockStates, file?.id])

	const reset = () => {
		Analytics.resetGenerator(gen.id, model?.historyIndex ?? 1, 'menu')
		model?.reset(DataModel.wrapLists(model.schema.default()), true)
	}
	const undo = (e: MouseEvent) => {
		e.stopPropagation()
		Analytics.undoGenerator(gen.id, model?.historyIndex ?? 1, 'menu')
		model?.undo()
	}
	const redo = (e: MouseEvent) => {
		e.stopPropagation()
		Analytics.redoGenerator(gen.id, model?.historyIndex ?? 1, 'menu')
		model?.redo()
	}

	const onKeyUp = (e: KeyboardEvent) => {
		if (e.ctrlKey && e.key === 'z') {
			Analytics.undoGenerator(gen.id, model?.historyIndex ?? 1, 'hotkey')
			model?.undo()
		} else if (e.ctrlKey && e.key === 'y') {
			Analytics.redoGenerator(gen.id, model?.historyIndex ?? 1, 'hotkey')
			model?.redo()
		}
	}
	const onKeyDown = (e: KeyboardEvent) => {
		if (e.ctrlKey && e.key === 's') {
			setFileSaving('hotkey')
			e.preventDefault()
			e.stopPropagation()
		}
	}
	useEffect(() => {
		document.addEventListener('keyup', onKeyUp)
		document.addEventListener('keydown', onKeyDown)
		return () => {
			document.removeEventListener('keyup', onKeyUp)
			document.removeEventListener('keydown', onKeyDown)
		}
	}, [model, blockStates, file])

	const [presets, setPresets] = useState<string[]>([])
	useEffect(() => {
		getCollections(version).then(collections => {
			setPresets(collections.get(gen.id).map(p => p.startsWith('minecraft:') ? p.slice(10) : p))
		})
			.catch(e => { console.error(e); setError(e) })
	}, [version, gen.id])

	const selectPreset = (id: string) => {
		Analytics.loadPreset(gen.id, id)
		setSharedSnippetId(undefined, true)
		changeTargetVersion(version, true)
		setCurrentPreset(id)
	}

	const loadPreset = async (id: string) => {
		try {
			const preset = await fetchPreset(version, gen.path ?? gen.id, id)
			const seed = model?.get(new Path(['generator', 'seed']))
			if (preset?.generator?.seed !== undefined && seed !== undefined) {
				preset.generator.seed = seed
				if (preset.generator.biome_source?.seed !== undefined) {
					preset.generator.biome_source.seed = seed
				}
			}
			return preset
		} catch (e) {
			setError(`Cannot load preset ${id} in ${version}`)
			setCurrentPreset(undefined, true)
		}
	}

	const selectVersion = (version: VersionId) => {
		setSharedSnippetId(undefined, true)
		changeVersion(version)
		if (project.name !== DRAFT_PROJECT.name && project.version !== version) {
			updateProject({ version })
		}
	}

	const [shareUrl, setShareUrl] = useState<string | undefined>(undefined)
	const [shareLoading, setShareLoading] = useState(false)
	const [shareShown, setShareShown] = useState(false)
	const [shareCopyActive, shareCopySuccess] = useActiveTimeout({ cooldown: 3000 })
	const share = () => {
		if (shareShown) {
			setShareShown(false)
			return
		}
		if (currentPreset) {
			setShareUrl(`${location.origin}/${gen.url}/?version=${version}&preset=${currentPreset}`)
			setShareShown(true)
			copySharedId()
		} else if (model && blockStates) {
			const output = getOutput(model, blockStates)
			if (deepEqual(output, model.schema.default())) {
				setShareUrl(`${location.origin}/${gen.url}/?version=${version}`)
				setShareShown(true)
			} else {
				setShareLoading(true)
				shareSnippet(gen.id, version, output, previewShown)
					.then(({ id, length, compressed, rate }) => {
						Analytics.createSnippet(gen.id, id, version, length, compressed, rate)
						const url = `${location.origin}/${gen.url}/?${SHARE_KEY}=${id}`
						setShareUrl(url)
						setShareShown(true)
					})
					.catch(e => {
						if (e instanceof Error) {
							setError(e)
						}
					})
					.finally(() => setShareLoading(false))
			}
		}
	}
	const copySharedId = () => {
		navigator.clipboard.writeText(shareUrl ?? '')
		shareCopySuccess()
	}
	useEffect(() => {
		if (!shareCopyActive) {
			setShareUrl(undefined)
			setShareShown(false)
		}
	}, [shareCopyActive])

	const [sourceShown, setSourceShown] = useState(window.innerWidth > 820)
	const [doCopy, setCopy] = useState(0)
	const [doDownload, setDownload] = useState(0)
	const [doImport, setImport] = useState(0)

	const copySource = () => {
		Analytics.copyOutput(gen.id, 'menu')
		setCopy(doCopy + 1)
	}
	const downloadSource = () => {
		Analytics.downloadOutput(gen.id, 'menu')
		setDownload(doDownload + 1)
	}
	const importSource = () => {
		Analytics.generatorEvent('import')
		setSourceShown(true)
		setImport(doImport + 1)
	}
	const toggleSource = () => {
		if (sourceShown) {
			Analytics.hideOutput(gen.id, 'menu')
		} else {
			Analytics.showOutput(gen.id, 'menu')
		}
		setSourceShown(!sourceShown)
		setCopy(0)
		setDownload(0)
		setImport(0)
	}

	const [copyActive, copySuccess] = useActiveTimeout()

	const [previewShown, setPreviewShown] = useState(Store.getPreviewPanelOpen() ?? window.innerWidth > 800)
	const hasPreview = HasPreview.includes(gen.id) && !(gen.id === 'worldgen/configured_feature' && checkVersion(version, '1.18'))
	if (previewShown && !hasPreview) setPreviewShown(false)
	let actionsShown = 2
	if (hasPreview) actionsShown += 1
	if (sourceShown) actionsShown += 2

	const togglePreview = () => {
		if (sourceShown) {
			Analytics.hidePreview(gen.id, 'menu')
		} else {
			Analytics.showPreview(gen.id, 'menu')
		}
		setPreviewShown(!previewShown)
		if (!previewShown && sourceShown) {
			setSourceShown(false)
		}
	}

	const [projectShown, setProjectShown] = useState(Store.getProjectPanelOpen() ?? window.innerWidth > 1000)
	const toggleProjectShown = useCallback(() => {
		if (projectShown) {
			Analytics.hideProject(gen.id, projects.length, project.files.length, 'menu')
		} else {
			Analytics.showProject(gen.id, projects.length, project.files.length, 'menu')
		}
		Store.setProjectPanelOpen(!projectShown)
		setProjectShown(!projectShown)
	}, [projectShown])

	const [projectCreating, setProjectCreating] = useState(false)
	const [projectDeleting, setprojectDeleting] = useState(false)
	const [fileSaving, setFileSaving] = useState<string | undefined>(undefined)
	const [fileRenaming, setFileRenaming] = useState<{ type: string, id: string } | undefined>(undefined)

	return <>
		<main class={`generator${previewShown ? ' has-preview' : ''}${projectShown ? ' has-project' : ''}`}>
			{!gen.partner && <Ad id="data-pack-generator" type="text" />}
			<div class="controls generator-controls">
				<Btn icon="upload" label={locale('import')} onClick={importSource} />
				<BtnMenu icon="archive" label={locale('presets')} relative={false}>
					<SearchList searchPlaceholder={locale('search')} noResults={locale('no_presets')} values={presets} onSelect={selectPreset}/>
				</BtnMenu>
				<VersionSwitcher value={version} onChange={selectVersion} allowed={allowedVersions} />
				<BtnMenu icon="kebab_horizontal" tooltip={locale('more')}>
					<Btn icon="history" label={locale('reset_default')} onClick={reset} />
					{backup !== undefined && <Btn icon="history" label={locale('restore_backup')} onClick={loadBackup} />}
					<Btn icon="arrow_left" label={locale('undo')} onClick={undo} />
					<Btn icon="arrow_right" label={locale('redo')} onClick={redo} />
					<Btn icon="file" label={locale('project.save')} onClick={() => setFileSaving('menu')} />
				</BtnMenu>
			</div>
			{error && <ErrorPanel error={error} onDismiss={() => setError(null)} />}
			<Tree {...{model, version, blockStates}} onError={setError} />
			<Footer donate={!gen.partner} />
		</main>
		<div class="popup-actions right-actions" style={`--offset: -${8 + actionsShown * 50}px;`}>
			<div class={`popup-action action-preview${hasPreview ? ' shown' : ''} tooltipped tip-nw`} aria-label={locale(previewShown ? 'hide_preview' : 'show_preview')} onClick={togglePreview}>
				{previewShown ? Octicon.x_circle : Octicon.play}
			</div>
			<div class={`popup-action action-share shown tooltipped tip-nw${shareLoading ? ' loading' : ''}`} aria-label={locale(shareLoading ? 'share.loading' : 'share')} onClick={share}>
				{shareLoading ? Octicon.sync : Octicon.link}
			</div>
			<div class={`popup-action action-download${sourceShown ? ' shown' : ''} tooltipped tip-nw`} aria-label={locale('download')} onClick={downloadSource}>
				{Octicon.download}
			</div>
			<div class={`popup-action action-copy${sourceShown ? ' shown' : ''}${copyActive ? ' active' : ''} tooltipped tip-nw`} aria-label={locale(copyActive ? 'copied' : 'copy')} onClick={copySource}>
				{copyActive ? Octicon.check : Octicon.clippy}
			</div>
			<div class={'popup-action action-code shown tooltipped tip-nw'} aria-label={locale(sourceShown ? 'hide_output' : 'show_output')} onClick={toggleSource}>
				{sourceShown ? Octicon.chevron_right : Octicon.code}
			</div>
		</div>
		<div class={`popup-preview${previewShown ? ' shown' : ''}`}>
			<PreviewPanel {...{model, version, id: gen.id}} shown={previewShown} onError={setError} />
		</div>
		<div class={`popup-source${sourceShown ? ' shown' : ''}`}>
			<SourcePanel {...{model, blockStates, doCopy, doDownload, doImport}} name={gen.schema ?? 'data'} copySuccess={copySuccess} onError={setError} />
		</div>
		<div class={`popup-share${shareShown ? ' shown' : ''}`}>
			<TextInput value={shareUrl} readonly />
			<Btn icon={shareCopyActive ? 'check' : 'clippy'} onClick={copySharedId} tooltip={locale(shareCopyActive ? 'copied' : 'copy_share')} tooltipLoc="nw" active={shareCopyActive} />
		</div>
		<div class="popup-actions left-actions" style="--offset: 50px;">
			<div class={'popup-action action-project shown tooltipped tip-ne'} aria-label={locale(projectShown ? 'hide_project' : 'show_project')} onClick={toggleProjectShown}>
				{projectShown ? Octicon.chevron_left : Octicon.repo}
			</div>
		</div>
		<div class={`popup-project${projectShown ? ' shown' : ''}`}>
			<ProjectPanel {...{model, version, id: gen.id}} onError={setError} onDeleteProject={() => setprojectDeleting(true)} onRename={setFileRenaming} onCreate={() => setProjectCreating(true)} />
		</div>
		{projectCreating && <ProjectCreation onClose={() => setProjectCreating(false)} />}
		{projectDeleting && <ProjectDeletion onClose={() => setprojectDeleting(false)} />}
		{model && fileSaving && <FileCreation id={gen.id} model={model} method={fileSaving} onClose={() => setFileSaving(undefined)} />}
		{fileRenaming && <FileRenaming id={fileRenaming.type } name={fileRenaming.id} onClose={() => setFileRenaming(undefined)} />}
	</>
}

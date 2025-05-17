import { useCallback, useEffect, useErrorBoundary, useMemo, useRef, useState } from 'preact/hooks'
import type { Method } from '../../Analytics.js'
import { Analytics } from '../../Analytics.js'
import { appRoute } from '../../App.jsx'
import type { ConfigGenerator } from '../../Config.js'
import config from '../../Config.js'
import { DRAFT_PROJECT, useLocale, useProject, useVersion } from '../../contexts/index.js'
import { useModal } from '../../contexts/Modal.jsx'
import { useSpyglass, watchSpyglassUri } from '../../contexts/Spyglass.jsx'
import { AsyncCancel, useActiveTimeout, useAsync, useLocalStorage, useSearchParam } from '../../hooks/index.js'
import type { VersionId } from '../../services/index.js'
import { checkVersion, fetchDependencyMcdoc, fetchPreset, fetchRegistries, getSnippet, shareSnippet } from '../../services/index.js'
import { DEPENDENCY_URI } from '../../services/Spyglass.js'
import { Store } from '../../Store.js'
import { cleanUrl, genPath } from '../../Utils.js'
import { FancyMenu } from '../FancyMenu.jsx'
import { Ad, Btn, BtnMenu, ErrorPanel, FileCreation, FileView, Footer, HasPreview, Octicon, PreviewPanel, ProjectPanel, SourcePanel, TextInput, VersionSwitcher } from '../index.js'
import { getRootDefault } from './McdocHelpers.js'

export const SHARE_KEY = 'share'
const MIN_PROJECT_PANEL_WIDTH = 200

interface Props {
	gen: ConfigGenerator
	allowedVersions: VersionId[],
}
export function SchemaGenerator({ gen, allowedVersions }: Props) {
	const { locale } = useLocale()
	const { version, changeVersion, changeTargetVersion } = useVersion()
	const { service } = useSpyglass()
	const { showModal } = useModal()
	const { project, projectUri, setProjectUri, updateProject } = useProject()
	const [error, setError] = useState<Error | string | null>(null)
	const [errorBoundary, errorRetry] = useErrorBoundary()
	if (errorBoundary) {
		const generatorError = new Error(`Generator error: ${errorBoundary.message}`)
		if (errorBoundary.stack) {
			generatorError.stack = errorBoundary.stack
		}
		return <main><ErrorPanel error={generatorError} onDismiss={errorRetry} /></main>
	}

	useEffect(() => Store.visitGenerator(gen.id), [gen.id])

	const uri = useMemo(() => {
		if (!service) {
			return undefined
		}
		if (projectUri) {
			const category = projectUri.endsWith('/pack.mcmeta')
				? 'pack_mcmeta'
				: service.dissectUri(projectUri)?.category
			if (category === gen.id) {
				return projectUri
			} else {
				setProjectUri(undefined)
			}
		}
		return service.getUnsavedFileUri(gen)
	}, [service, version, gen, projectUri])

	const [currentPreset, setCurrentPreset] = useSearchParam('preset')
	const [sharedSnippetId, setSharedSnippetId] = useSearchParam(SHARE_KEY)
	const ignoreChange = useRef(false)

	const { value: docAndNode, loading: docLoading, error: docError } = useAsync(async () => {
		let text: string | undefined = undefined
		if (currentPreset && sharedSnippetId) {
			setSharedSnippetId(undefined)
			return AsyncCancel
		}
		if (currentPreset) {
			text = await loadPreset(currentPreset)
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
					appRoute(`${cleanUrl(snippetGen.url)}?${SHARE_KEY}=${snippet.id}`)
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
			text = snippet.text
		}
		if (!service || !uri) {
			return AsyncCancel
		}
		// TODO: clear the dependencies that are not used
		// Right now if you do this, the mcdoc breaks when switching back to the dependency later
		if (gen.dependency) {
			const dependency = await fetchDependencyMcdoc(gen.dependency)
			const dependencyUri = `${DEPENDENCY_URI}${gen.dependency}.mcdoc`
			await service.writeFile(dependencyUri, dependency)
		}
		if (text !== undefined) {
			ignoreChange.current = true
			await service.writeFile(uri, text)
			ignoreChange.current = false
		} else {
			text = await service.readFile(uri)
			if (text === undefined) {
				const node = getRootDefault(gen.id, service.getCheckerContext())
				text = service.formatNode(node, uri)
				await service.writeFile(uri, text)
			}
		}
		ignoreChange.current = true
		const docAndNode = await service.openFile(uri)
		ignoreChange.current = false
		Analytics.setGenerator(gen.id)
		return docAndNode
	}, [gen.id, version, sharedSnippetId, currentPreset, service, uri])

	const { doc } = docAndNode ?? {}

	watchSpyglassUri(uri, () => {
		if (!ignoreChange.current) {
			setCurrentPreset(undefined, true)
			setSharedSnippetId(undefined, true)
		}
		ignoreChange.current = false
		setError(null)
	}, [])

	const reset = async () => {
		if (!service || !uri) {
			return
		}
		Analytics.resetGenerator(gen.id, 1, 'menu')
		const node = getRootDefault(gen.id, service.getCheckerContext())
		const newText = service.formatNode(node, uri)
		await service.writeFile(uri, newText)
	}
	const undo = async (e: MouseEvent) => {
		e.stopPropagation()
		if (!service || !uri) {
			return
		}
		Analytics.undoGenerator(gen.id, 1, 'menu')
		await service.undoEdit(uri)
	}
	const redo = async (e: MouseEvent) => {
		e.stopPropagation()
		if (!service || !uri) {
			return
		}
		Analytics.redoGenerator(gen.id, 1, 'menu')
		await service?.redoEdit(uri)
	}

	const saveFile = useCallback((method: Method) => {
		if (!docAndNode) {
			return
		}
		showModal(() => <FileCreation gen={gen} docAndNode={docAndNode} method={method} />)
	}, [showModal, gen, docAndNode])

	useEffect(() => {
		const onKeyDown = async (e: KeyboardEvent) => {
			if (!service || !uri) {
				return
			}
			if (e.ctrlKey && e.key === 'z') {
				e.preventDefault()
				Analytics.undoGenerator(gen.id, 1, 'hotkey')
				await service.undoEdit(uri)
			} else if (e.ctrlKey && e.key === 'y') {
				e.preventDefault()
				Analytics.redoGenerator(gen.id, 1, 'hotkey')
				await service.redoEdit(uri)
			} else if (e.ctrlKey && e.key === 's') {
				saveFile('hotkey')
				e.preventDefault()
				e.stopPropagation()
			}
		}

		document.addEventListener('keydown', onKeyDown)
		return () => {
			document.removeEventListener('keydown', onKeyDown)
		}
	}, [gen.id, service, uri, saveFile])

	const { value: presets } = useAsync(async () => {
		const registries = await fetchRegistries(version)
		const entries = registries.get(gen.id) ?? []
		return entries.map(e => e.startsWith('minecraft:') ? e.slice(10) : e)
	}, [version, gen.id])

	const getPresets = useCallback((search: string, close: () => void) => {
		if (presets === undefined) {
			return <span class="w-80 note">{locale('loading')}</span>
		}
		if (!presets || presets.length === 0) {
			return <span class="w-80 note">{locale('presets.no_results')}</span>
		}
		const terms = search.trim().split(' ')
		const results = presets?.filter(v => terms.every(t => v.includes(t))).slice(0, 100) ?? []
		if (results.length === 0) {
			return <span class="w-80 note">{locale('presets.no_results_for_query')}</span>
		}
		return results.map(r => <button class="w-80 flex items-center cursor-pointer no-underline rounded p-1"  onClick={() => {selectPreset(r); close()}}>
			{r}
		</button>)
	}, [presets])

	const selectPreset = (id: string) => {
		Analytics.loadPreset(gen.id, id)
		setSharedSnippetId(undefined, true)
		changeTargetVersion(version, true)
		setCurrentPreset(id)
	}

	const loadPreset = async (id: string) => {
		try {
			return await fetchPreset(version, genPath(gen, version), id)
		} catch (e) {
			setError(`Cannot load preset ${id} in ${version}`)
			setCurrentPreset(undefined, true)
			return undefined
		}
	}

	const selectVersion = (version: VersionId) => {
		setSharedSnippetId(undefined, true)
		changeVersion(version)
		if (project && project.name !== DRAFT_PROJECT.name && project.version !== version) {
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
		} else if (doc) {
			setShareLoading(true)
			shareSnippet(gen.id, version, doc.getText(), previewShown)
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
		Store.setPreviewPanelOpen(!previewShown)
		setPreviewShown(!previewShown)
	}

	const [projectShown, setProjectShown] = useState(Store.getProjectPanelOpen() ?? false)
	const toggleProjectShown = useCallback(() => {
		if (projectShown) {
			Analytics.hideProject('menu')
		} else {
			Analytics.showProject('menu')
		}
		Store.setProjectPanelOpen(!projectShown)
		setProjectShown(!projectShown)
	}, [projectShown])

	const [panelWidth, setPanelWidth] = useLocalStorage('misode_project_panel_width', MIN_PROJECT_PANEL_WIDTH, (s) => Number(s), (v) => v.toString())
	const [realPanelWidth, setRealPanelWidth] = useState(panelWidth)
	const [resizeStart, setResizeStart] = useState<number>()

	useEffect(() => {
		const onMouseMove = (e: MouseEvent) => {
			if (resizeStart) {
				const targetWidth = e.clientX - resizeStart
				if (targetWidth < 50) {
					setProjectShown(false)
				} else {
					setRealPanelWidth(Math.max(MIN_PROJECT_PANEL_WIDTH, targetWidth))
				}
			}
		}
		window.addEventListener('mousemove', onMouseMove)
		return () => window.removeEventListener('mousemove', onMouseMove)
	}, [resizeStart])

	useEffect(() => {
		const onMouseUp = () => {
			setResizeStart(undefined)
			if (realPanelWidth < MIN_PROJECT_PANEL_WIDTH) {
				setRealPanelWidth(panelWidth)
			} else {
				setPanelWidth(realPanelWidth)
			}
		}
		window.addEventListener('mouseup', onMouseUp)
		return () => window.removeEventListener('mouseup', onMouseUp)
	}, [panelWidth, realPanelWidth])

	const newEmptyFile = useCallback(async () => {
		if (service) {
			const unsavedUri = service.getUnsavedFileUri(gen)
			const node = getRootDefault(gen.id, service.getCheckerContext())
			const text = service.formatNode(node, unsavedUri)
			await service.writeFile(unsavedUri, text)
		}
		setProjectUri(undefined)
	}, [gen, service, showModal])

	return <>
		<main class={`${previewShown ? 'has-preview' : ''} ${projectShown ? 'has-project' : ''}`} style={`--project-panel-width: ${realPanelWidth}px`}>
			{!gen.tags?.includes('partners') && <Ad id="data-pack-generator" type="text" />}
			<div class="controls generator-controls">
				{gen.wiki && <a class="btn btn-link tooltipped tip-se" aria-label={locale('learn_on_the_wiki')} href={gen.wiki} target="_blank">
					{Octicon.mortar_board}
					<span>{locale('wiki')}</span>
				</a>}
				<FancyMenu placeholder={locale('search')} getResults={getPresets} relative={false} class="right-0 mt-2">
					<Btn icon="archive" label={locale('presets')} />
				</FancyMenu>
				<VersionSwitcher value={version} onChange={selectVersion} allowed={allowedVersions} />
				<BtnMenu icon="kebab_horizontal" tooltip={locale('more')}>
					<Btn icon="history" label={locale('reset_default')} onClick={reset} />
					<Btn icon="arrow_left" label={locale('undo')} onClick={undo} />
					<Btn icon="arrow_right" label={locale('redo')} onClick={redo} />
					<Btn icon="plus_circle" label={locale('project.new_file')} onClick={newEmptyFile} />
					<Btn icon="file" label={locale('project.save')} onClick={() => saveFile('menu')} />
				</BtnMenu>
			</div>
			{error && <ErrorPanel error={error} onDismiss={() => setError(null)} />}
			{docError
				? <ErrorPanel error={docError} />
				: <FileView docAndNode={docLoading ? undefined : docAndNode} />}
			<Footer donate={!gen.tags?.includes('partners')} />
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
				{copyActive ? Octicon.check : Octicon.copy}
			</div>
			<div class={'popup-action action-code shown tooltipped tip-nw'} aria-label={locale(sourceShown ? 'hide_output' : 'show_output')} onClick={toggleSource}>
				{sourceShown ? Octicon.chevron_right : Octicon.code}
			</div>
		</div>
		<div class={`popup-preview${previewShown ? ' shown' : ''}`}>
			<PreviewPanel docAndNode={docAndNode} id={gen.id} shown={previewShown} />
		</div>
		<div class={`popup-source${sourceShown ? ' shown' : ''}`}>
			<SourcePanel docAndNode={docAndNode} {...{doCopy, doDownload, doImport}} copySuccess={copySuccess} onError={setError} />
		</div>
		<div class={`popup-share${shareShown ? ' shown' : ''}`}>
			<TextInput value={shareUrl} readonly />
			<Btn icon={shareCopyActive ? 'check' : 'copy'} onClick={copySharedId} tooltip={locale(shareCopyActive ? 'copied' : 'copy_share')} tooltipLoc="nw" active={shareCopyActive} />
		</div>
		<div class="popup-actions left-actions" style="--offset: 50px;">
			<div class={'popup-action action-project shown tooltipped tip-ne'} aria-label={locale(projectShown ? 'hide_project' : 'show_project')} onClick={toggleProjectShown}>
				{projectShown ? Octicon.chevron_left : Octicon.repo}
			</div>
		</div>
		<div class={`popup-project${projectShown ? ' shown' : ''}`} style={`width: ${realPanelWidth}px`}>
			<ProjectPanel/>
			<div class="panel-resize" onMouseDown={(e) => setResizeStart(e.clientX - panelWidth)}></div>
		</div>
	</>
}

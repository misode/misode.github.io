import { route } from 'preact-router'
import { useCallback, useEffect, useErrorBoundary, useMemo, useRef, useState } from 'preact/hooks'
import { Analytics } from '../../Analytics.js'
import type { ConfigGenerator } from '../../Config.js'
import config from '../../Config.js'
import { DRAFT_PROJECT, useLocale, useProject, useVersion } from '../../contexts/index.js'
import { useSpyglass, watchSpyglassUri } from '../../contexts/Spyglass.jsx'
import { AsyncCancel, useActiveTimeout, useAsync, useSearchParam } from '../../hooks/index.js'
import type { VersionId } from '../../services/index.js'
import { checkVersion, fetchDependencyMcdoc, fetchPreset, fetchRegistries, getSnippet, shareSnippet } from '../../services/index.js'
import { Store } from '../../Store.js'
import { cleanUrl, genPath, safeJsonParse } from '../../Utils.js'
import { Ad, Btn, BtnMenu, ErrorPanel, FileCreation, FileRenaming, Footer, HasPreview, Octicon, PreviewPanel, ProjectCreation, ProjectDeletion, ProjectPanel, SearchList, SourcePanel, TextInput, Tree, VersionSwitcher } from '../index.js'
import { getRootDefault } from './McdocHelpers.js'

export const SHARE_KEY = 'share'

interface Props {
	gen: ConfigGenerator
	allowedVersions: VersionId[],
}
export function SchemaGenerator({ gen, allowedVersions }: Props) {
	const { locale } = useLocale()
	const { version, changeVersion, changeTargetVersion } = useVersion()
	const { service } = useSpyglass()
	const { projects, project, file, updateProject, updateFile, closeFile } = useProject()
	const [error, setError] = useState<Error | string | null>(null)
	const [errorBoundary, errorRetry] = useErrorBoundary()
	if (errorBoundary) {
		errorBoundary.message = `Something went wrong rendering the generator: ${errorBoundary.message}`
		return <main><ErrorPanel error={errorBoundary} onDismiss={errorRetry} /></main>
	}

	useEffect(() => Store.visitGenerator(gen.id), [gen.id])

	const uri = useMemo(() => {
		// TODO: return different uri when project file is open
		return service?.getUnsavedFileUri(gen)
	}, [service, version, gen])

	const [currentPreset, setCurrentPreset] = useSearchParam('preset')
	const [sharedSnippetId, setSharedSnippetId] = useSearchParam(SHARE_KEY)
	const ignoreChange = useRef(false)

	const { value: docAndNode } = useAsync(async () => {
		let text: string | undefined = undefined
		if (currentPreset && sharedSnippetId) {
			setSharedSnippetId(undefined)
			return AsyncCancel
		}
		if (currentPreset) {
			text = await loadPreset(currentPreset)
			ignoreChange.current = true
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
			ignoreChange.current = true
			text = snippet.text
		} else if (file) {
			if (project.version && project.version !== version) {
				changeVersion(project.version, false)
				return AsyncCancel
			}
			ignoreChange.current = true
			text = JSON.stringify(file.data, null, 2)
		}
		if (!service || !uri) {
			return AsyncCancel
		}
		if (gen.dependency) {
			const dependency = await fetchDependencyMcdoc(gen.dependency)
			const dependencyUri = `file:///project/mcdoc/${gen.dependency}.mcdoc`
			await service.writeFile(dependencyUri, dependency)
		}
		if (text !== undefined) {
			await service.writeFile(uri, text)
		} else {
			text = await service.readFile(uri)
			if (text === undefined) {
				const node = getRootDefault(gen.id, service.getCheckerContext())
				text = service.formatNode(node, uri)
				await service.writeFile(uri, text)
			}
		}
		const docAndNode = await service.openFile(uri)
		Analytics.setGenerator(gen.id)
		return docAndNode
	}, [gen.id, version, sharedSnippetId, currentPreset, project.name, file?.id, service])

	const { doc } = docAndNode ?? {}

	watchSpyglassUri(uri, ({ doc }) => {
		if (!ignoreChange.current) {
			setCurrentPreset(undefined, true)
			setSharedSnippetId(undefined, true)
		}
		if (file) {
			const data = safeJsonParse(doc.getText())
			if (data !== undefined) {
				updateFile(gen.id, file.id, { id: file.id, data })
			}
		}
		ignoreChange.current = false
		setError(null)
	}, [updateFile])

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
				setFileSaving('hotkey')
				e.preventDefault()
				e.stopPropagation()
			}
		}

		document.addEventListener('keydown', onKeyDown)
		return () => {
			document.removeEventListener('keydown', onKeyDown)
		}
	}, [gen.id, service, uri])

	const { value: presets } = useAsync(async () => {
		const registries = await fetchRegistries(version)
		const entries = registries.get(gen.id) ?? []
		return entries.map(e => e.startsWith('minecraft:') ? e.slice(10) : e)
	}, [version, gen.id])

	const selectPreset = (id: string) => {
		Analytics.loadPreset(gen.id, id)
		setSharedSnippetId(undefined, true)
		changeTargetVersion(version, true)
		setCurrentPreset(id)
	}

	const loadPreset = async (id: string) => {
		try {
			const preset = await fetchPreset(version, genPath(gen, version), id)
			// TODO: sync random seed
			return preset
		} catch (e) {
			setError(`Cannot load preset ${id} in ${version}`)
			setCurrentPreset(undefined, true)
			return undefined
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
		} else {
			// TODO: check if files hasn't been modified compared to the default
			if (false) {
				setShareUrl(`${location.origin}/${gen.url}/?version=${version}`)
				setShareShown(true)
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

	const onNewFile = useCallback(() => {
		closeFile()
		// TODO: create new file with default contents
	}, [closeFile])

	return <>
		<main class={`${previewShown ? 'has-preview' : ''} ${projectShown ? 'has-project' : ''}`}>
			{!gen.tags?.includes('partners') && <Ad id="data-pack-generator" type="text" />}
			<div class="controls generator-controls">
				{gen.wiki && <a class="btn btn-link tooltipped tip-se" aria-label={locale('learn_on_the_wiki')} href={gen.wiki} target="_blank">
					{Octicon.mortar_board}
					<span>{locale('wiki')}</span>
				</a>}
				<BtnMenu icon="archive" label={locale('presets')} relative={false}>
					<SearchList searchPlaceholder={locale('search')} noResults={locale('no_presets')} values={presets} onSelect={selectPreset}/>
				</BtnMenu>
				<VersionSwitcher value={version} onChange={selectVersion} allowed={allowedVersions} />
				<BtnMenu icon="kebab_horizontal" tooltip={locale('more')}>
					<Btn icon="history" label={locale('reset_default')} onClick={reset} />
					<Btn icon="arrow_left" label={locale('undo')} onClick={undo} />
					<Btn icon="arrow_right" label={locale('redo')} onClick={redo} />
					<Btn icon="plus_circle" label={locale('project.new_file')} onClick={onNewFile} />
					<Btn icon="file" label={locale('project.save')} onClick={() => setFileSaving('menu')} />
				</BtnMenu>
			</div>
			{error && <ErrorPanel error={error} onDismiss={() => setError(null)} />}
			{docAndNode && <Tree docAndNode={docAndNode} onError={setError} />}
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
			<PreviewPanel docAndNode={docAndNode} id={gen.id} shown={previewShown} onError={setError} />
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
		<div class={`popup-project${projectShown ? ' shown' : ''}`}>
			<ProjectPanel onError={setError} onDeleteProject={() => setprojectDeleting(true)} onRename={setFileRenaming} onCreate={() => setProjectCreating(true)} />
		</div>
		{projectCreating && <ProjectCreation onClose={() => setProjectCreating(false)} />}
		{projectDeleting && <ProjectDeletion onClose={() => setprojectDeleting(false)} />}
		{docAndNode && fileSaving && <FileCreation id={gen.id} docAndNode={docAndNode} method={fileSaving} onClose={() => setFileSaving(undefined)} />}
		{fileRenaming && <FileRenaming id={fileRenaming.type } name={fileRenaming.id} onClose={() => setFileRenaming(undefined)} />}
	</>
}

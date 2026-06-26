import {Fragment} from 'preact'
import {route} from 'preact-router'
import {useCallback, useEffect, useErrorBoundary, useMemo, useRef, useState} from 'preact/hooks'
import {fileUtil} from '@spyglassmc/core'
import type {Method} from '../../Analytics.js'
import {Analytics} from '../../Analytics.js'
import type {ConfigGenerator} from '../../Config.js'
import config from '../../Config.js'
import {DRAFT_PROJECT, useLocale, useProject, useVersion} from '../../contexts/index.js'
import {useModal} from '../../contexts/Modal.jsx'
import {useSpyglass, watchSpyglassUri} from '../../contexts/Spyglass.jsx'
import {AsyncCancel, useActiveTimeout, useAsync, useLocalStorage, useSearchParam} from '../../hooks/index.js'
import {Configuration, DefaultApi} from '../../services/integration/gen/index.js'
import type {QuestRoot} from '../../services/integration/QuestApi.js'
import {QuestApi} from '../../services/integration/QuestApi.js'
import type {VersionId} from '../../services/index.js'
import {
  checkVersion,
  fetchDependencyMcdoc,
  fetchPreset,
  fetchRegistries,
  getSnippet,
  shareSnippet
} from '../../services/index.js'
import {DEPENDENCY_URI} from '../../services/Spyglass.js'
import {Store} from '../../Store.js'
import {cleanUrl, genPath} from '../../Utils.js'
import {FancyMenu} from '../FancyMenu.jsx'
import {
  Btn,
  BtnMenu,
  ErrorPanel,
  FileCreation,
  FileView,
  Footer,
  HasPreview,
  Octicon,
  PasswordInput,
  PreviewPanel,
  ProjectPanel,
  SourcePanel,
  TextInput,
  VersionSwitcher
} from '../index.js'
import {Modal} from '../Modal.js'
import {getRootDefault} from './McdocHelpers.js'

export const SHARE_KEY = 'share'
const MIN_PROJECT_PANEL_WIDTH = 200

interface DialogTokenModalProps {
	onToken: (token: string) => void
	onCancel: () => void
	serviceName?: string
}

function DialogTokenModal({ onToken, onCancel, serviceName = 'dialog' }: DialogTokenModalProps) {
	const [token, setToken] = useState('')
	const [error, setError] = useState<string | null>(null)

	const submit = () => {
		const t = token.trim()
		if (!t) {
			setError('Token is required')
			return
		}
		setError(null)
		onToken(t)
	}

	return (
		<Modal class="dialog-token-modal">
			<div class="flex flex-col gap-2">
				<p>Enter authorization token for {serviceName} API</p>
				<PasswordInput
					class="btn btn-input"
					value={token}
					onChange={(v) => { setError(null); setToken(v) }}
					onEnter={submit}
					onCancel={onCancel}
					placeholder="Token"
					spellcheck={false}
					autofocus
				/>
				{error && <p class="note">{error}</p>}
				<div class="dialog-token-modal-actions flex gap-2">
					<button type="button" class="btn" onClick={onCancel}>Cancel</button>
					<button type="button" class="btn" onClick={submit}>Submit</button>
				</div>
			</div>
		</Modal>
	)
}

interface Props {
	gen: ConfigGenerator
	allowedVersions: VersionId[],
}
export function SchemaGenerator({ gen, allowedVersions }: Props) {
	const { locale } = useLocale()
	const { version, changeVersion, changeTargetVersion } = useVersion()
	const { service } = useSpyglass()
	const { showModal, hideModal } = useModal()
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
	const isDialogGenerator = gen.id === 'blood:blood-dialog'
	const DIALOG_TOKEN_KEY = 'blood_dialog_api_token'
	const [dialogToken, setDialogToken] = useLocalStorage(DIALOG_TOKEN_KEY, '')
	const hasDialogToken = dialogToken.trim().length > 0
	const dialogApi = useMemo(
		() => hasDialogToken ? new DefaultApi(new Configuration({ headers: { Authorization: dialogToken } })) : null,
		[dialogToken, hasDialogToken]
	)
	const dialogFilePickerRef = useRef<HTMLDialogElement>(null)
	const [dialogFilePickerLoading, setDialogFilePickerLoading] = useState(false)
	const [dialogFileAction, setDialogFileAction] = useState<'upload' | 'download' | 'delete'>('download')
	const [dialogFiles, setDialogFiles] = useState<string[]>([])
	const [dialogTargetFile, setDialogTargetFile] = useState('')
	const [dialogUploadLoading, setDialogUploadLoading] = useState(false)
	const [dialogDownloadLoading, setDialogDownloadLoading] = useState(false)
	const [dialogDeleteLoading, setDialogDeleteLoading] = useState(false)
	const isQuestGenerator = gen.id === 'blood:blood-quest'
	const QUEST_TOKEN_KEY = 'blood_quest_api_token'
	const [questToken, setQuestToken] = useLocalStorage(QUEST_TOKEN_KEY, '')
	const [questRootId, setQuestRootId] = useLocalStorage('blood_quest_api_root', 'live')
	const [serverQuestId, setServerQuestId] = useLocalStorage('blood_quest_api_file', '')
	const hasQuestToken = questToken.trim().length > 0
	const questApi = useMemo(
		() => hasQuestToken ? new QuestApi(new Configuration({ headers: { Authorization: questToken } })) : null,
		[questToken, hasQuestToken]
	)
	const questFilePickerRef = useRef<HTMLDialogElement>(null)
	const [questFilePickerLoading, setQuestFilePickerLoading] = useState(false)
	const [questFileAction, setQuestFileAction] = useState<'open' | 'save'>('open')
	const [questRoots, setQuestRoots] = useState<QuestRoot[]>([])
	const [questFiles, setQuestFiles] = useState<string[]>([])
	const [questTargetId, setQuestTargetId] = useState('')
	const [questOpenLoading, setQuestOpenLoading] = useState(false)
	const [questSaveLoading, setQuestSaveLoading] = useState(false)
	const [questStatus, setQuestStatus] = useState('')

	const closeDialogFilePicker = useCallback(() => {
		dialogFilePickerRef.current?.close()
	}, [])

	const closeQuestFilePicker = useCallback(() => {
		questFilePickerRef.current?.close()
	}, [])

	const openDialogTokenModal = useCallback(() => {
		if (!isDialogGenerator) {
			return
		}
		showModal(() => (
			<DialogTokenModal
				onToken={(t) => {
					setDialogToken(t)
					hideModal()
				}}
				onCancel={hideModal}
			/>
		))
	}, [isDialogGenerator, showModal, hideModal, setDialogToken])

	const openDialogFilePicker = useCallback(async (action: 'upload' | 'download' | 'delete') => {
		if (!isDialogGenerator || !uri) {
			return
		}
		if (!hasDialogToken || !dialogApi) {
			return
		}
		setDialogFileAction(action)
		setDialogFilePickerLoading(true)
		dialogFilePickerRef.current?.showModal()
		const currentFile = fileUtil.basename(uri)
		try {
			const files = await dialogApi.apiDialogListGet()
			const uniqueFiles = Array.from(new Set(files)).sort((a, b) => a.localeCompare(b))
			setDialogFiles(uniqueFiles)
			if (action === 'upload') {
				setDialogTargetFile(currentFile)
			} else {
				setDialogTargetFile(uniqueFiles[0] ?? currentFile)
			}
		} catch (e) {
			if (e instanceof Error) {
				setError(e)
			} else {
				setError('Failed to list dialog files')
			}
			closeDialogFilePicker()
		} finally {
			setDialogFilePickerLoading(false)
		}
	}, [isDialogGenerator, uri, hasDialogToken, dialogApi, closeDialogFilePicker])

	const submitDialogFileAction = useCallback(async () => {
		if (!uri || !service || !dialogApi) {
			return
		}
		const targetFile = dialogTargetFile.trim()
		if (!targetFile) {
			setError('Dialog file name is required')
			return
		}
		if (dialogFileAction !== 'upload' && !dialogFiles.includes(targetFile)) {
			setError(`Dialog file \"${targetFile}\" was not found`)
			return
		}
		try {
			if (dialogFileAction === 'upload') {
				if (!doc) {
					return
				}
				setDialogUploadLoading(true)
				const body = JSON.parse(doc.getText()) as object
				await dialogApi.apiDialogUploadPost({ file: targetFile, body })
			} else {
				if (dialogFileAction === 'download') {
					setDialogDownloadLoading(true)
					const body = await dialogApi.apiDialogDownloadGet({ file: targetFile })
					await service.writeFile(uri, `${JSON.stringify(body, null, 2)}\n`)
				} else {
					setDialogDeleteLoading(true)
					await dialogApi.apiDialogDeleteDelete({ file: targetFile })
					setDialogFiles(dialogFiles.filter(file => file !== targetFile))
				}
			}
			closeDialogFilePicker()
		} catch (e) {
			if (e instanceof Error) {
				setError(e)
			} else {
				setError(`Failed to ${dialogFileAction} dialog file`)
			}
		} finally {
			setDialogUploadLoading(false)
			setDialogDownloadLoading(false)
			setDialogDeleteLoading(false)
		}
	}, [uri, service, dialogTargetFile, dialogFileAction, dialogFiles, doc, dialogApi, closeDialogFilePicker])

	const openQuestTokenModal = useCallback(() => {
		if (!isQuestGenerator) {
			return
		}
		showModal(() => (
			<DialogTokenModal
				serviceName="quest"
				onToken={(t) => {
					setQuestToken(t)
					hideModal()
				}}
				onCancel={hideModal}
			/>
		))
	}, [isQuestGenerator, showModal, hideModal, setQuestToken])

	const questIdFromDocument = useCallback(() => {
		if (!doc) {
			return ''
		}
		const body = JSON.parse(doc.getText()) as { id?: unknown }
		return typeof body.id === 'string' ? body.id : ''
	}, [doc])

	const loadQuestFiles = useCallback(async (rootId: string) => {
		if (!questApi) {
			return []
		}
		const files = await questApi.list(rootId)
		const uniqueFiles = Array.from(new Set(files)).sort((a, b) => a.localeCompare(b))
		setQuestFiles(uniqueFiles)
		return uniqueFiles
	}, [questApi])

	const openQuestFilePicker = useCallback(async (action: 'open' | 'save') => {
		if (!isQuestGenerator || !uri || !questApi) {
			return
		}
		setQuestFileAction(action)
		setQuestFilePickerLoading(true)
		questFilePickerRef.current?.showModal()
		try {
			const roots = await questApi.roots()
			if (roots.length === 0) {
				throw new Error('No quest roots are available')
			}
			setQuestRoots(roots)
			const selectedRoot = roots.some(root => root.id === questRootId) ? questRootId : roots[0].id
			setQuestRootId(selectedRoot)
			const files = await loadQuestFiles(selectedRoot)
			const currentQuestId = action === 'save'
				? (() => {
					try {
						return questIdFromDocument()
					} catch {
						return ''
					}
				})()
				: ''
			const previousQuestId = serverQuestId && files.includes(serverQuestId) ? serverQuestId : ''
			setQuestTargetId(action === 'save' ? currentQuestId || serverQuestId : previousQuestId || files[0] || '')
		} catch (e) {
			if (e instanceof Error) {
				setError(e)
				setQuestStatus(`Error: ${e.message}`)
			} else {
				setError('Failed to list quest files')
				setQuestStatus('Error: failed to list quest files')
			}
			closeQuestFilePicker()
		} finally {
			setQuestFilePickerLoading(false)
		}
	}, [isQuestGenerator, uri, questApi, questRootId, setQuestRootId, loadQuestFiles, questIdFromDocument, serverQuestId, closeQuestFilePicker])

	const changeQuestRoot = useCallback(async (rootId: string) => {
		setQuestRootId(rootId)
		setQuestFilePickerLoading(true)
		try {
			const files = await loadQuestFiles(rootId)
			if (questFileAction === 'open') {
				setQuestTargetId(files.includes(serverQuestId) ? serverQuestId : files[0] || '')
			}
		} catch (e) {
			if (e instanceof Error) {
				setError(e)
				setQuestStatus(`Error: ${e.message}`)
			} else {
				setError('Failed to list quest files')
				setQuestStatus('Error: failed to list quest files')
			}
		} finally {
			setQuestFilePickerLoading(false)
		}
	}, [setQuestRootId, loadQuestFiles, questFileAction, serverQuestId])

	const submitQuestFileAction = useCallback(async () => {
		if (!uri || !service || !questApi) {
			return
		}
		const targetId = questTargetId.trim().replace(/\.json$/, '')
		if (!questRootId) {
			setError('Quest root is required')
			setQuestStatus('Error: quest root is required')
			return
		}
		if (!targetId) {
			setError('Quest id is required')
			setQuestStatus('Error: quest id is required')
			return
		}

		try {
			if (questFileAction === 'open') {
				if (!questFiles.includes(targetId)) {
					throw new Error(`Quest \"${targetId}\" was not found`)
				}
				setQuestOpenLoading(true)
				setQuestStatus(`Opening ${targetId}...`)
				const body = await questApi.file(questRootId, targetId)
				try {
					ignoreChange.current = true
					await service.writeFile(uri, `${JSON.stringify(body, null, 2)}\n`)
				} finally {
					ignoreChange.current = false
				}
				setServerQuestId(targetId)
				setQuestStatus(`Opened ${targetId}`)
			} else {
				if (!doc) {
					return
				}
				setQuestSaveLoading(true)
				setQuestStatus(`Saving ${targetId}...`)
				const body = JSON.parse(doc.getText()) as { id?: unknown }
				if (typeof body.id !== 'string' || body.id.trim() === '') {
					throw new Error('Current quest JSON must contain an id')
				}
				if (body.id !== targetId) {
					throw new Error(`Current quest id '${body.id}' does not match target id '${targetId}'`)
				}
				const result = await questApi.save(questRootId, targetId, body)
				setServerQuestId(targetId)
				setQuestFiles(prev => Array.from(new Set([...prev, targetId])).sort((a, b) => a.localeCompare(b)))
				setQuestStatus(result.reloaded
					? `Saved and reloaded ${targetId}`
					: `Saved ${targetId}; non-live root was not reloaded`)
			}
			closeQuestFilePicker()
		} catch (e) {
			if (e instanceof Error) {
				setError(e)
				setQuestStatus(`Error: ${e.message}`)
			} else {
				setError(`Failed to ${questFileAction} quest file`)
				setQuestStatus(`Error: failed to ${questFileAction} quest file`)
			}
		} finally {
			setQuestOpenLoading(false)
			setQuestSaveLoading(false)
		}
	}, [uri, service, questApi, questTargetId, questRootId, questFileAction, questFiles, doc, setServerQuestId, closeQuestFilePicker])

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
	if (isDialogGenerator) actionsShown += 4
	if (isQuestGenerator) actionsShown += 3
	if (hasPreview) actionsShown += 1
	if (sourceShown) actionsShown += 2
	const dialogActionsEnabled = isDialogGenerator && hasDialogToken && !!dialogApi
	const questActionsEnabled = isQuestGenerator && hasQuestToken && !!questApi

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

	return <Fragment>
		<main class={`${previewShown ? 'has-preview' : ''} ${projectShown ? 'has-project' : ''}`} style={`--project-panel-width: ${realPanelWidth}px`}>
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
			<div
				class={`popup-action action-dialog-token${isDialogGenerator ? ' shown' : ''} tooltipped tip-nw${hasDialogToken ? '' : ' active'}`}
				aria-label={hasDialogToken ? 'Dialog token is set' : 'Set dialog API token'}
				onClick={openDialogTokenModal}
			>
				{hasDialogToken ? Octicon.unlock : Octicon.lock}
			</div>
			<div
				class={`popup-action action-dialog-download${isDialogGenerator ? ' shown' : ''} tooltipped tip-nw${dialogDownloadLoading ? ' loading' : ''}`}
				style={!dialogActionsEnabled ? 'opacity: 0.4; cursor: not-allowed;' : undefined}
				aria-label={!dialogActionsEnabled ? 'Set dialog token to enable' : locale('dialog_download')}
				aria-disabled={!dialogActionsEnabled}
				onClick={dialogActionsEnabled ? () => openDialogFilePicker('download') : undefined}
			>
				{dialogDownloadLoading ? Octicon.sync : Octicon.download}
			</div>
			<div
				class={`popup-action action-dialog-upload${isDialogGenerator ? ' shown' : ''} tooltipped tip-nw${dialogUploadLoading ? ' loading' : ''}`}
				style={!dialogActionsEnabled ? 'opacity: 0.4; cursor: not-allowed;' : undefined}
				aria-label={!dialogActionsEnabled ? 'Set dialog token to enable' : locale('dialog_upload')}
				aria-disabled={!dialogActionsEnabled}
				onClick={dialogActionsEnabled ? () => openDialogFilePicker('upload') : undefined}
			>
				{dialogUploadLoading ? Octicon.sync : Octicon.upload}
			</div>
			<div
				class={`popup-action action-dialog-delete${isDialogGenerator ? ' shown' : ''} tooltipped tip-nw${dialogDeleteLoading ? ' loading' : ''}`}
				style={!dialogActionsEnabled ? 'opacity: 0.4; cursor: not-allowed;' : undefined}
				aria-label={!dialogActionsEnabled ? 'Set dialog token to enable' : locale('dialog_delete')}
				aria-disabled={!dialogActionsEnabled}
				onClick={dialogActionsEnabled ? () => openDialogFilePicker('delete') : undefined}
			>
				{dialogDeleteLoading ? Octicon.sync : Octicon.trashcan}
			</div>
			<div
				class={`popup-action action-quest-token${isQuestGenerator ? ' shown' : ''} tooltipped tip-nw${hasQuestToken ? '' : ' active'}`}
				aria-label={hasQuestToken ? 'Quest token is set' : 'Set quest API token'}
				onClick={openQuestTokenModal}
			>
				{hasQuestToken ? Octicon.unlock : Octicon.lock}
			</div>
			<div
				class={`popup-action action-quest-open${isQuestGenerator ? ' shown' : ''} tooltipped tip-nw${questOpenLoading ? ' loading' : ''}`}
				style={!questActionsEnabled ? 'opacity: 0.4; cursor: not-allowed;' : undefined}
				aria-label={!questActionsEnabled ? 'Set quest token to enable' : 'Open from server'}
				aria-disabled={!questActionsEnabled}
				onClick={questActionsEnabled ? () => openQuestFilePicker('open') : undefined}
			>
				{questOpenLoading ? Octicon.sync : Octicon.download}
			</div>
			<div
				class={`popup-action action-quest-save${isQuestGenerator ? ' shown' : ''} tooltipped tip-nw${questSaveLoading ? ' loading' : ''}`}
				style={!questActionsEnabled ? 'opacity: 0.4; cursor: not-allowed;' : undefined}
				aria-label={!questActionsEnabled ? 'Set quest token to enable' : 'Save to server'}
				aria-disabled={!questActionsEnabled}
				onClick={questActionsEnabled ? () => openQuestFilePicker('save') : undefined}
			>
				{questSaveLoading ? Octicon.sync : Octicon.upload}
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
		{isQuestGenerator && questStatus && <div class="quest-server-status">{questStatus}</div>}
		<dialog ref={dialogFilePickerRef} class="dialog-file-picker">
			<div class="dialog-file-picker-content">
				<h3>{dialogFileAction === 'upload' ? 'Upload dialog JSON' : dialogFileAction === 'delete' ? 'Delete saved dialog' : 'Download dialog JSON'}</h3>
				{dialogFilePickerLoading
					? <p>Loading files...</p>
					: dialogFileAction !== 'upload'
						? <select value={dialogTargetFile} onInput={(e) => setDialogTargetFile((e.target as HTMLSelectElement).value)}>
							{dialogFiles.map(file => <option value={file} key={file}>{file}</option>)}
						</select>
						: <input
							type="text"
							value={dialogTargetFile}
							onInput={(e) => setDialogTargetFile((e.target as HTMLInputElement).value)}
							placeholder="dialog.json"
						/>
				}
				<div class="dialog-file-picker-actions">
					<button type="button" class="btn" onClick={closeDialogFilePicker}>Cancel</button>
					<button
						type="button"
						class="btn"
						disabled={dialogFilePickerLoading || dialogUploadLoading || dialogDownloadLoading || dialogDeleteLoading}
						onClick={submitDialogFileAction}
					>
						{dialogFileAction === 'upload' ? 'Upload' : dialogFileAction === 'delete' ? 'Delete' : 'Download'}
					</button>
				</div>
			</div>
		</dialog>
		<dialog ref={questFilePickerRef} class="dialog-file-picker">
			<div class="dialog-file-picker-content">
				<h3>{questFileAction === 'save' ? 'Save to server' : 'Open from server'}</h3>
				<label class="dialog-file-picker-label" htmlFor="quest-root">Root</label>
				<select
					id="quest-root"
					value={questRootId}
					disabled={questFilePickerLoading}
					onInput={(e) => void changeQuestRoot((e.target as HTMLSelectElement).value)}
				>
					{questRoots.map(root => <option value={root.id} key={root.id}>{root.label}{root.live ? ' (live)' : ' (non-live)'}</option>)}
				</select>
				{questFilePickerLoading
					? <p>Loading quests...</p>
					: questFileAction === 'open'
						? <select value={questTargetId} onInput={(e) => setQuestTargetId((e.target as HTMLSelectElement).value)}>
							{questFiles.map(file => <option value={file} key={file}>{file}</option>)}
						</select>
						: <input
							type="text"
							value={questTargetId}
							onInput={(e) => setQuestTargetId((e.target as HTMLInputElement).value)}
							placeholder="quest_intro"
						/>
				}
				{questRoots.find(root => root.id === questRootId)?.live
					? <p class="note">Live root: save reloads quests on the running server.</p>
					: <p class="note">Non-live root: save writes the file without server reload.</p>}
				<div class="dialog-file-picker-actions">
					<button type="button" class="btn" onClick={closeQuestFilePicker}>Cancel</button>
					<button
						type="button"
						class="btn"
						disabled={questFilePickerLoading || questOpenLoading || questSaveLoading}
						onClick={submitQuestFileAction}
					>
						{questFileAction === 'save' ? 'Save' : 'Open'}
					</button>
				</div>
			</div>
		</dialog>
		<div class="popup-actions left-actions" style="--offset: 50px;">
			<div class={'popup-action action-project shown tooltipped tip-ne'} aria-label={locale(projectShown ? 'hide_project' : 'show_project')} onClick={toggleProjectShown}>
				{projectShown ? Octicon.chevron_left : Octicon.repo}
			</div>
		</div>
		<div class={`popup-project${projectShown ? ' shown' : ''}`} style={`width: ${realPanelWidth}px`}>
			<ProjectPanel/>
			<div class="panel-resize" onMouseDown={(e) => setResizeStart(e.clientX - panelWidth)}></div>
		</div>
	</Fragment>
}

import { DataModel, Path } from '@mcschema/core'
import { getCurrentUrl, route } from 'preact-router'
import { useEffect, useErrorBoundary, useState } from 'preact/hooks'
import config from '../../config.json'
import { Analytics } from '../Analytics'
import { Ad, Btn, BtnMenu, ErrorPanel, HasPreview, Octicon, PreviewPanel, SearchList, SourcePanel, TextInput, Tree } from '../components'
import { useLocale, useProject, useTitle, useVersion } from '../contexts'
import { useActiveTimeout, useModel } from '../hooks'
import { getOutput } from '../schema/transformOutput'
import type { BlockStateRegistry, VersionId } from '../services'
import { checkVersion, fetchPreset, getBlockStates, getCollections, getModel } from '../services'
import { getGenerator, getSearchParams, message, setSeachParams } from '../Utils'

interface Props {
	default?: true,
}
export function Generator({}: Props) {
	const { locale } = useLocale()
	const { version, changeVersion } = useVersion()
	const { project, file, updateFile, openFile, closeFile } = useProject()
	const [error, setError] = useState<string | null>(null)
	const [errorBoundary, errorRetry] = useErrorBoundary()
	if (errorBoundary) {
		return <main><ErrorPanel error={`Something went wrong rendering the generator: ${errorBoundary.message}`} onDismiss={errorRetry} /></main>
	}

	const gen = getGenerator(getCurrentUrl())
	if (!gen) {
		return <main><ErrorPanel error={`Cannot find generator "${getCurrentUrl()}"`} /></main>
	}

	const allowedVersions = config.versions
		.filter(v => checkVersion(v.id, gen.minVersion, gen.maxVersion))
		.map(v => v.id as VersionId)

	useTitle(locale('title.generator', locale(gen.id)), allowedVersions)

	if (!checkVersion(version, gen.minVersion)) {
		setError(`The minimum version for this generator is ${gen.minVersion}`)
	}
	if (!checkVersion(version, undefined, gen.maxVersion)) {
		setError(`This generator is not available in versions above ${gen.maxVersion}`)
	}

	const searchParams = getSearchParams(getCurrentUrl())
	const currentPreset = searchParams.get('preset')
	useEffect(() => {
		if (model && currentPreset) {
			selectPreset(currentPreset)
		}
	}, [currentPreset])

	const [model, setModel] = useState<DataModel | null>(null)
	const [blockStates, setBlockStates] = useState<BlockStateRegistry | null>(null)
	useEffect(() => {
		setError(null)
		setModel(null)
		getBlockStates(version)
			.then(b => setBlockStates(b))
		getModel(version, gen.id)
			.then(async m => {
				Analytics.setGenerator(gen.id)
				if (currentPreset) {
					const preset = await loadPreset(currentPreset)
					m.reset(DataModel.wrapLists(preset), false)
				}
				setModel(m)
			})
			.catch(e => { console.error(e); setError(message(e)) })
	}, [version, gen.id])

	const [dirty, setDirty] = useState(false)
	useModel(model, () => {
		setSeachParams({ version: undefined, preset: undefined })
		setError(null)
		setDirty(true)
	})

	const [fileRename, setFileRename] = useState('')
	const [fileSaved, doSave] = useActiveTimeout()
	const [fileError, doFileError] = useActiveTimeout()

	const doFileRename = () => {
		if (fileRename !== file?.id && fileRename && model && blockStates) {
			const data = getOutput(model, blockStates)
			const success = updateFile(gen.id, file?.id, { id: fileRename, data })
			if (success) {
				doSave()
			} else {
				doFileError()
				if (file) {
					setFileRename(file?.id)
				}
			}
		} else if (file) {
			setFileRename(file?.id)
		}
	}

	const deleteFile = () => {
		if (file) {
			updateFile(gen.id, file.id, {})
		}
	}

	useEffect(() => {
		if (file) {
			setFileRename(file.id)
		}
	}, [file])

	useEffect(() => {
		if (model) {
			setFileRename(file?.id ?? '')
			if (file && gen.id === file.type) {
				model.reset(DataModel.wrapLists(file.data))
			} else {
				model.reset(DataModel.wrapLists(model.schema.default()), true)
			}
			setDirty(false)
		}
	}, [file, model])

	const reset = () => {
		Analytics.generatorEvent('reset')
		model?.reset(DataModel.wrapLists(model.schema.default()), true)
	}
	const undo = (e: MouseEvent) => {
		e.stopPropagation()
		Analytics.generatorEvent('undo', 'Menu')
		model?.undo()
	}
	const redo = (e: MouseEvent) => {
		e.stopPropagation()
		Analytics.generatorEvent('redo', 'Menu')
		model?.redo()
	}

	const onKeyUp = (e: KeyboardEvent) => {
		if (e.ctrlKey && e.key === 'z') {
			Analytics.generatorEvent('undo', 'Hotkey')
			model?.undo()
		} else if (e.ctrlKey && e.key === 'y') {
			Analytics.generatorEvent('redo', 'Hotkey')
			model?.redo()
		}
	}
	const onKeyDown = (e: KeyboardEvent) => {
		if (e.ctrlKey && e.key === 's') {
			e.preventDefault()
			if (model && blockStates && file) {
				Analytics.generatorEvent('save', 'Hotkey')
				const data = getOutput(model, blockStates)
				updateFile(gen.id, file?.id, { id: file?.id, data })
				setDirty(false)
				doSave()
			}
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
			setPresets(collections.get(gen.id).map(p => p.slice(10)))
		})
			.catch(e => { console.error(e); setError(e.message) })
	}, [version, gen.id])

	const selectPreset = (id: string) => {
		loadPreset(id).then(preset => {
			model?.reset(DataModel.wrapLists(preset), false)
			setSeachParams({ version, preset: id })
		})
	}

	const loadPreset = async (id: string) => {
		Analytics.generatorEvent('load-preset', id)
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
			setError(message(e))
		}
	}

	const [sourceShown, setSourceShown] = useState(window.innerWidth > 820)
	const [doCopy, setCopy] = useState(0)
	const [doDownload, setDownload] = useState(0)
	const [doImport, setImport] = useState(0)

	const copySource = () => {
		Analytics.generatorEvent('copy')
		setCopy(doCopy + 1)
	}
	const downloadSource = () => {
		Analytics.generatorEvent('download')
		setDownload(doDownload + 1)
	}
	const importSource = () => {
		Analytics.generatorEvent('import')
		setSourceShown(true)
		setImport(doImport + 1)
	}
	const toggleSource = () => {
		Analytics.generatorEvent('toggle-output', !sourceShown ? 'visible' : 'hidden')
		setSourceShown(!sourceShown)
		setCopy(0)
		setDownload(0)
		setImport(0)
	}

	const [copyActive, copySuccess] = useActiveTimeout()

	const [previewShown, setPreviewShown] = useState(false)
	const hasPreview = HasPreview.includes(gen.id)
	if (previewShown && !hasPreview) setPreviewShown(false)
	let actionsShown = 1
	if (hasPreview) actionsShown += 1
	if (sourceShown) actionsShown += 2

	const togglePreview = () => {
		Analytics.generatorEvent('toggle-preview', !previewShown ? 'visible' : 'hidden')
		setPreviewShown(!previewShown)
		if (!previewShown && sourceShown) {
			setSourceShown(false)
		}
	}

	return <>
		<main class={previewShown ? 'has-preview' : ''}>
			<Ad id="data-pack-generator" type="text" />
			<div class="controls">
				<div class={`project-controls ${file && 'has-file'}`}>
					<div class="btn-row">
						<BtnMenu icon="repo" label={project.name} relative={false}>
							<Btn icon="arrow_left" label={locale('project.go_to')} onClick={() => route('/project')} />
							{file && <Btn icon="file" label={locale('project.new_file')} onClick={closeFile} />}
							<SearchList searchPlaceholder={locale(project.name === 'Drafts' ? 'project.search_drafts' : 'project.search')} noResults={locale('project.no_files')} values={project.files.filter(f => f.type === gen.id).map(f => f.id)} onSelect={(id) => openFile(gen.id, id)} />
						</BtnMenu>
						<TextInput class="btn btn-input" placeholder={locale('project.unsaved_file')} value={fileRename} onChange={setFileRename} onEnter={doFileRename} onBlur={doFileRename} />
						{file && <Btn icon="trashcan" tooltip={locale('project.delete_file')} onClick={deleteFile} />}
					</div>
					{dirty ? <div class="status-icon">{Octicon.dot_fill}</div>
						: fileSaved ? <div class="status-icon active">{Octicon.check}</div>
							: fileError && <div class="status-icon danger">{Octicon.x}</div> }
				</div>
				<div class="generator-controls">
					<Btn icon="upload" label={locale('import')} onClick={importSource} />
					<BtnMenu icon="archive" label={locale('presets')} relative={false}>
						<SearchList searchPlaceholder={locale('search')} noResults={locale('no_presets')} values={presets} onSelect={selectPreset}/>
					</BtnMenu>
					<BtnMenu icon="tag" label={version} tooltip={locale('switch_version')} data-cy="version-switcher">
						{allowedVersions.reverse().map(v =>
							<Btn label={v} active={v === version} onClick={() => changeVersion(v)} />
						)}
					</BtnMenu>
					<BtnMenu icon="kebab_horizontal" tooltip={locale('more')}>
						<Btn icon="history" label={locale('reset')} onClick={reset} />
						<Btn icon="arrow_left" label={locale('undo')} onClick={undo} />
						<Btn icon="arrow_right" label={locale('redo')} onClick={redo} />
					</BtnMenu>
				</div>
			</div>
			{error && <ErrorPanel error={error} onDismiss={() => setError(null)} />}
			<Tree {...{model, version, blockStates}} onError={setError} />
		</main>
		<div class="popup-actions" style={`--offset: -${8 + actionsShown * 50}px;`}>
			<div class={`popup-action action-preview${hasPreview ? ' shown' : ''} tooltipped tip-nw`} aria-label={locale(previewShown ? 'hide_preview' : 'show_preview')} onClick={togglePreview}>
				{previewShown ? Octicon.x_circle : Octicon.play}
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
	</>
}

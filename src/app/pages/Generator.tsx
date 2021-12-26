import { DataModel, Path } from '@mcschema/core'
import { getCurrentUrl } from 'preact-router'
import { useEffect, useErrorBoundary, useRef, useState } from 'preact/hooks'
import config from '../../config.json'
import { Analytics } from '../Analytics'
import { Ad, Btn, BtnInput, BtnMenu, ErrorPanel, HasPreview, Octicon, PreviewPanel, SourcePanel, Tree } from '../components'
import { useModel } from '../hooks'
import { locale } from '../Locales'
import type { BlockStateRegistry, VersionId } from '../services'
import { checkVersion, fetchPreset, getBlockStates, getCollections, getModel } from '../services'
import { getGenerator, getSearchParams, message, setSeachParams } from '../Utils'

type GeneratorProps = {
	lang: string,
	changeTitle: (title: string, versions?: VersionId[]) => unknown,
	version: VersionId,
	changeVersion: (version: VersionId) => unknown,
	default?: true,
}
export function Generator({ lang, changeTitle, version, changeVersion }: GeneratorProps) {
	const loc = locale.bind(null, lang)
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

	changeTitle(loc('title.generator', loc(gen.id)), allowedVersions)

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

	useModel(model, () => {
		setSeachParams({ version: undefined, preset: undefined })
		setError(null)
	})

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
	useEffect(() => {
		document.addEventListener('keyup', onKeyUp)
		return () => {
			document.removeEventListener('keyup', onKeyUp)
		}
	}, [model])

	const [presetFilter, setPresetFilter] = useState('')
	const [presetResults, setPresetResults] = useState<string[]>([])
	useEffect(() => {
		getCollections(version)
			.then(collections => {
				const terms = (presetFilter ?? '').trim().split(' ')
				const presets = collections.get(gen.id)
					.map(p => p.slice(10))
					.filter(p => terms.every(t => p.includes(t)))
				if (presets) {
					setPresetResults(presets)
				}
			})
			.catch(e => { console.error(e); setError(e.message) })
	}, [version, gen.id, presetFilter])

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

	const [copyActive, setCopyActive] = useState(false)
	const copyTimeout = useRef<number | undefined>(undefined)
	const copySuccess = () => {
		setCopyActive(true)
		if (copyTimeout.current !== undefined) clearTimeout(copyTimeout.current)
		copyTimeout.current = setTimeout(() => {
			setCopyActive(false)
		}, 2000) as any
	}

	const [previewShown, setPreviewShown] = useState(false)
	const hasPreview = HasPreview.includes(gen.id)
	if (previewShown && !hasPreview) setPreviewShown(false)
	let actionsShown = 1
	if (hasPreview) actionsShown += 1
	if (sourceShown) actionsShown += 2

	const togglePreview = () => {
		Analytics.generatorEvent('toggle-preview', !previewShown ? 'visible' : 'hidden')
		setPreviewShown(!previewShown)
	}

	return <>
		<main class={previewShown ? 'has-preview' : ''}>
			<Ad id="data-pack-generator" type="text" />
			<div class="controls">
				<Btn icon="upload" label={loc('import')} onClick={importSource} />
				<BtnMenu icon="archive" label={loc('presets')} relative={false}>
					<BtnInput icon="search" large value={presetFilter} onChange={setPresetFilter} doSelect={1} placeholder={loc('search')} />
					<div class="result-list">
						{presetResults.map(preset => <Btn label={preset} onClick={() => selectPreset(preset)} />)}
					</div>
					{presetResults.length === 0 && <Btn label={loc('no_presets')}/>}
				</BtnMenu>
				<BtnMenu icon="tag" label={version} data-cy="version-switcher">
					{allowedVersions.reverse().map(v =>
						<Btn label={v} active={v === version} onClick={() => changeVersion(v)} />
					)}
				</BtnMenu>
				<BtnMenu icon="kebab_horizontal" tooltip={loc('more')}>
					<Btn icon="history" label={loc('reset')} onClick={reset} />
					<Btn icon="arrow_left" label={loc('undo')} onClick={undo} />
					<Btn icon="arrow_right" label={loc('redo')} onClick={redo} />
				</BtnMenu>
			</div>
			{error && <ErrorPanel error={error} onDismiss={() => setError(null)} />}
			<Tree {...{lang, model, version, blockStates}} onError={setError} />
		</main>
		<div class="popup-actions" style={`--offset: -${8 + actionsShown * 50}px;`}>
			<div class={`popup-action action-preview${hasPreview ? ' shown' : ''} tooltipped tip-nw`} aria-label={loc(previewShown ? 'hide_preview' : 'show_preview')} onClick={togglePreview}>
				{previewShown ? Octicon.x_circle : Octicon.play}
			</div>
			<div class={`popup-action action-download${sourceShown ? ' shown' : ''} tooltipped tip-nw`} aria-label={loc('download')} onClick={downloadSource}>
				{Octicon.download}
			</div>
			<div class={`popup-action action-copy${sourceShown ? ' shown' : ''}${copyActive ? ' active' : ''} tooltipped tip-nw`} aria-label={loc(copyActive ? 'copied' : 'copy')} onClick={copySource}>
				{copyActive ? Octicon.check : Octicon.clippy}
			</div>
			<div class={'popup-action action-code shown tooltipped tip-nw'} aria-label={loc(sourceShown ? 'hide_output' : 'show_output')} onClick={toggleSource}>
				{sourceShown ? Octicon.chevron_right : Octicon.code}
			</div>
		</div>
		<div class={`popup-preview${previewShown ? ' shown' : ''}`}>
			<PreviewPanel {...{lang, model, version, id: gen.id}} shown={previewShown} onError={setError} />
		</div>
		<div class={`popup-source${sourceShown ? ' shown' : ''}`}>
			<SourcePanel {...{lang, model, blockStates, doCopy, doDownload, doImport}} name={gen.schema ?? 'data'} copySuccess={copySuccess} onError={setError} />
		</div>
	</>
}

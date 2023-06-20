import { useCallback, useEffect, useErrorBoundary, useMemo, useRef, useState } from 'preact/hooks'
import config from '../Config.js'
import { deepClone, deepEqual, writeZip } from '../Utils.js'
import { BasicSettings } from '../components/customized/BasicSettings.jsx'
import { generateCustomized } from '../components/customized/CustomizedGenerator.js'
import { CustomizedModel } from '../components/customized/CustomizedModel.js'
import { OresSettings } from '../components/customized/OresSettings.jsx'
import { StructuresSettings } from '../components/customized/StructuresSettings.jsx'
import { Btn, ErrorPanel, Footer, Octicon, VersionSwitcher } from '../components/index.js'
import { useLocale, useTitle } from '../contexts/index.js'
import { useSearchParam } from '../hooks/index.js'
import { stringifySource } from '../services/Source.js'

const Tabs = ['basic', 'structures', 'ores']

interface Props {
	path?: string,
}
export function Customized({}: Props) {
	const { locale } = useLocale()
	// const { version, changeVersion } = useVersion()
	const version = '1.20'
	const changeVersion = () => {}
	useTitle(locale('title.customized'))

	const [errorBoundary, errorRetry] = useErrorBoundary()
	if (errorBoundary) {
		errorBoundary.message = `Something went wrong with the customized world tool: ${errorBoundary.message}`
		return <main><ErrorPanel error={errorBoundary} onDismiss={errorRetry} /></main>
	}

	const [tab, setTab] = useSearchParam('tab')
	useEffect(() => {
		if (tab === undefined || !Tabs.includes(tab)) {
			setTab(Tabs[0], true)
		}
	}, [tab])

	const [model, setModel] = useState(CustomizedModel.getDefault(version))
	const changeModel = useCallback((change: Partial<CustomizedModel>) => {
		setModel(m => ({ ...m, ...change }))
	}, [])
	const initialModel = useMemo(() => {
		return CustomizedModel.getDefault(version)
	}, [version])
	const isModified = useMemo(() => {
		return !deepEqual(model, initialModel)
	}, [model, initialModel])

	const reset = useCallback(() => {
		setModel(deepClone(initialModel))
	}, [initialModel])

	const download = useRef<HTMLAnchorElement>(null)
	const [error, setError] = useState<Error | string | null>(null)
	const [hasDownloaded, setHasDownloaded] = useState(false)
	const generate = useCallback(async () => {
		if (!download.current) return
		try {
			const pack = await generateCustomized(model, version)
			console.log('Generated customized', pack)
			const entries = Object.entries(pack).flatMap(([type, files]) => {
				const prefix = `data/minecraft/${type}/`
				return [...files.entries()].map(([name, data]) => {
					return [prefix + name + '.json', stringifySource(data, 'json')] as [string, string]
				})
			})
			const pack_format = config.versions.find(v => v.id === version)!.pack_format
			entries.push(['pack.mcmeta', stringifySource({ pack: { pack_format, description: 'Customized world from misode.github.io' } }, 'json')])
			const url = await writeZip(entries)
			download.current.setAttribute('href', url)
			download.current.setAttribute('download', 'customized.zip')
			download.current.click()
			setHasDownloaded(true)
			setError(null)
		} catch (e) {
			if (e instanceof Error) {
				e.message = `Something went wrong creating the customized pack: ${e.message}`
				setError(e)
			}
		}
	}, [model, version])

	return <main>
		<div class="container customized">
			<div class="tabs tabs-sticky">
				<span class={tab === 'basic' ? 'selected' : ''} onClick={() => setTab('basic')}>{locale('customized.basic')}</span>
				<span class={tab === 'structures' ? 'selected' : ''} onClick={() => setTab('structures')}>{locale('customized.structures')}</span>
				<span class={tab === 'ores' ? 'selected' : ''} onClick={() => setTab('ores')}>{locale('customized.ores')}</span>
				<VersionSwitcher value={version} onChange={changeVersion} allowed={['1.20']} />
			</div>
			<div class="customized-tab">
				{tab === 'basic' && <BasicSettings {...{model, initialModel, changeModel}} />}
				{tab === 'structures' && <StructuresSettings {...{model, initialModel, changeModel}} />}
				{tab === 'ores' && <OresSettings {...{model, initialModel, changeModel}} />}
			</div>
			<div class="customized-actions">
				<Btn icon="download" label="Create" class="customized-create" tooltip="Create and download data pack" tooltipLoc="se" onClick={generate} />
				<a ref={download} style="display: none;"></a>
				{isModified && <Btn icon="undo" label="Reset" tooltip="Reset to default" tooltipLoc="se" onClick={reset} />}
			</div>
			{error && <ErrorPanel error={error} onDismiss={() => setError(null)} body={`\n### Customized settings\n<details>\n<pre>\n${JSON.stringify(getDiffModel(model, initialModel), null, 2)}\n</pre>\n</details>\n`} />}
			{hasDownloaded && <div class="customized-instructions">
				<h4>
					{Octicon.mortar_board}
					What now?
				</h4>
				<ol>
					<li>After launching Minecraft, create a new singleplayer world.</li>
					<li>Select the "More" tab at the top.</li>
					<li>Click on "Data Packs" and drag the downloaded zip file onto the game window. </li>
					<li>Move the imported data pack to the right panel and click on "Done".</li>
					<li>A message will warn about the use of experimental world settings. Click on "Proceed".</li>
				</ol>
			</div>}
		</div>
		<Footer />
	</main>
}

function getDiffModel(model: any, initial: any) {
	const result = deepClone(model)
	if (typeof result !== 'object' || result === null) return
	Object.keys(result).forEach(key => {
		if (deepEqual(result[key], initial[key])) {
			delete result[key]
		} else if (typeof result[key] === 'object' && result[key] !== null) {
			result[key] = getDiffModel(result[key], initial[key])
		}
	})
	return result
}

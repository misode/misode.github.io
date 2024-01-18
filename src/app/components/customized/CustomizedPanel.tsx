import { useCallback, useMemo, useRef, useState } from 'preact/hooks'
import config from '../../Config.js'
import { deepClone, deepEqual, writeZip } from '../../Utils.js'
import { useVersion } from '../../contexts/Version.jsx'
import { stringifySource } from '../../services/Source.js'
import { Btn } from '../Btn.jsx'
import { ErrorPanel } from '../ErrorPanel.jsx'
import { Octicon } from '../Octicon.jsx'
import { BasicSettings } from './BasicSettings.jsx'
import { BiomesSettings } from './BiomesSettings.jsx'
import { generateCustomized } from './CustomizedGenerator.js'
import { CustomizedModel } from './CustomizedModel.js'
import { OresSettings } from './OresSettings.jsx'
import { StructuresSettings } from './StructuresSettings.jsx'

interface Props {
	tab: string | undefined
}
export function CustomizedPanel({ tab }: Props) {
	const { version } = useVersion()

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

	return <>
		<div class="customized-tab">
			{tab === 'basic' && <BasicSettings {...{model, initialModel, changeModel}} />}
			{tab === 'biomes' && <BiomesSettings {...{model, initialModel, changeModel}} />}
			{tab === 'structures' && <StructuresSettings {...{model, initialModel, changeModel}} />}
			{tab === 'ores' && <OresSettings {...{model, initialModel, changeModel}} />}
		</div>
		<div class="customized-actions">
			<Btn icon="download" label="Create" class="customized-create" tooltip="Create and download data pack" tooltipLoc="se" onClick={isModified ? generate : undefined} disabled={!isModified} />
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
	</>
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

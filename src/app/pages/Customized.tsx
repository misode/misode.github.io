import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import config from '../Config.js'
import { writeZip } from '../Utils.js'
import { BasicSettings } from '../components/customized/BasicSettings.jsx'
import { generateCustomized } from '../components/customized/CustomizedGenerator.js'
import { CustomizedModel } from '../components/customized/CustomizedModel.js'
import { OresSettings } from '../components/customized/OresSettings.jsx'
import { StructuresSettings } from '../components/customized/StructuresSettings.jsx'
import { Ad, Btn, Footer, VersionSwitcher } from '../components/index.js'
import { useLocale, useTitle, useVersion } from '../contexts/index.js'
import { useSearchParam } from '../hooks/index.js'
import { stringifySource } from '../services/Source.js'

const Tabs = ['basic', 'structures', 'ores']

interface Props {
	path?: string,
}
export function Customized({}: Props) {
	const { locale } = useLocale()
	const { version, changeVersion } = useVersion()
	useTitle(locale('title.customized'))

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

	const download = useRef<HTMLAnchorElement>(null)

	const generate = useCallback(async () => {
		if (!download.current) return
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
	}, [model, version])

	return <main>
		<div class="container customized">
			<Ad id="customized" type="text" />
			<div class="tabs tabs-sticky">
				<span class={tab === 'basic' ? 'selected' : ''} onClick={() => setTab('basic')}>{locale('customized.basic')}</span>
				<span class={tab === 'structures' ? 'selected' : ''} onClick={() => setTab('structures')}>{locale('customized.structures')}</span>
				<span class={tab === 'ores' ? 'selected' : ''} onClick={() => setTab('ores')}>{locale('customized.ores')}</span>
				<VersionSwitcher value={version} onChange={changeVersion} />
			</div>
			<div class="customized-tab">
				{tab === 'basic' && <BasicSettings {...{model, initialModel, changeModel}} />}
				{tab === 'structures' && <StructuresSettings {...{model, initialModel, changeModel}} />}
				{tab === 'ores' && <OresSettings {...{model, initialModel, changeModel}} />}
			</div>
			<div class="customized-actions">
				<Btn icon="download" label="Create" class="customized-create" onClick={generate} />
				<a ref={download} style="display: none;"></a>
			</div>
		</div>
		<Footer />
	</main>
}

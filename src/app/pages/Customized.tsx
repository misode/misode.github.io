import { useCallback, useEffect, useState } from 'preact/hooks'
import { BasicSettings } from '../components/customized/BasicSettings.jsx'
import type { CustomizedModel } from '../components/customized/CustomizedModel.js'
import { DefaultModel } from '../components/customized/CustomizedModel.js'
import { OresSettings } from '../components/customized/OresSettings.jsx'
import { StructuresSettings } from '../components/customized/StructuresSettings.jsx'
import { Btn, Footer } from '../components/index.js'
import { useLocale, useTitle } from '../contexts/index.js'
import { useSearchParam } from '../hooks/index.js'

const Tabs = ['basic', 'structures', 'ores']

interface Props {
	path?: string,
}
export function Customized({}: Props) {
	const { locale } = useLocale()
	// const { version, changeVersion } = useVersion()
	useTitle(locale('title.customized'))

	const [tab, setTab] = useSearchParam('tab')
	useEffect(() => {
		if (tab === undefined || !Tabs.includes(tab)) {
			setTab(Tabs[0], true)
		}
	}, [tab])

	const [model, setModel] = useState(DefaultModel)
	const changeModel = useCallback((change: Partial<CustomizedModel>) => {
		setModel(m => ({ ...m, ...change }))
	}, [])

	return <main>
		{/* <Ad id="customized" type="text" /> */}
		<div class="container">
			<div class="tabs">
				<span class={tab === 'basic' ? 'selected' : ''} onClick={() => setTab('basic')}>{locale('customized.basic')}</span>
				<span class={tab === 'structures' ? 'selected' : ''} onClick={() => setTab('structures')}>{locale('customized.structures')}</span>
				<span class={tab === 'ores' ? 'selected' : ''} onClick={() => setTab('ores')}>{locale('customized.ores')}</span>
			</div>
			<div class="customized-tab">
				{tab === 'basic' && <BasicSettings model={model} changeModel={changeModel} />}
				{tab === 'structures' && <StructuresSettings model={model} changeModel={changeModel} />}
				{tab === 'ores' && <OresSettings model={model} changeModel={changeModel} />}
			</div>
			<div class="customized-actions">
				<Btn icon="download" label="Create" class="customized-create" onClick={() => {}} />
				<span>This button does nothing currently. Only the UI is functional.</span>
			</div>
		</div>
		<Footer />
	</main>
}

import { useEffect, useErrorBoundary, useMemo } from 'preact/hooks'
import config from '../Config.js'
import { CustomizedPanel } from '../components/customized/CustomizedPanel.jsx'
import { ErrorPanel, Footer, Octicon, VersionSwitcher } from '../components/index.js'
import { useLocale, useTitle, useVersion } from '../contexts/index.js'
import { useSearchParam } from '../hooks/index.js'
import type { VersionId } from '../services/Schemas.js'
import { checkVersion } from '../services/Schemas.js'

const MIN_VERSION = '1.20'
const Tabs = ['basic', 'biomes', 'structures', 'ores']

interface Props {
	path?: string,
}
export function Customized({}: Props) {
	const { locale } = useLocale()
	const { version, changeVersion } = useVersion()
	useTitle(locale('title.customized'))

	const [errorBoundary, errorRetry] = useErrorBoundary()
	if (errorBoundary) {
		errorBoundary.message = `Something went wrong with the customized world tool: ${errorBoundary.message}`
		return <main><ErrorPanel error={errorBoundary} onDismiss={errorRetry} /></main>
	}

	const allowedVersions = useMemo(() => {
		return config.versions
			.filter(v => checkVersion(v.id, MIN_VERSION))
			.map(v => v.id as VersionId)
			.reverse()
	}, [])

	const [tab, setTab] = useSearchParam('tab')
	useEffect(() => {
		if (tab === undefined || !Tabs.includes(tab)) {
			setTab(Tabs[0], true)
		}
	}, [tab])

	return <main>
		<div class="legacy-container customized">
			<div class="tabs tabs-sticky">
				{Tabs.map(t =>
					<span class={tab === t ? 'selected' : ''} onClick={() => setTab(t)}>{locale(`customized.${t}`)}</span>
				)}
				<VersionSwitcher value={version} onChange={changeVersion} allowed={allowedVersions} />
			</div>
			{checkVersion(version, '1.20') ? <>
				<CustomizedPanel tab={tab} />
			</> : <>
				<ErrorPanel error={locale('customized.error_min_version', MIN_VERSION)} reportable={false}>
					<div class="error-actions">
						<div class="error-action" onClick={() => changeVersion(MIN_VERSION)}>
							{locale('generator.switch_version', MIN_VERSION)} {Octicon.arrow_right}
						</div>
					</div>
				</ErrorPanel>
			</>}
		</div>
		<Footer />
	</main>
}

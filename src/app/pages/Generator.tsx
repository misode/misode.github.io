import { getCurrentUrl, route } from 'preact-router'
import { useMemo } from 'preact/hooks'
import config from '../Config.js'
import { getGenerator } from '../Utils.js'
import { SchemaGenerator } from '../components/generator/SchemaGenerator.jsx'
import { ErrorPanel, Octicon } from '../components/index.js'
import { useLocale, useTitle, useVersion } from '../contexts/index.js'
import type { VersionId } from '../services/index.js'
import { checkVersion } from '../services/index.js'

export const SHARE_KEY = 'share'

interface Props {
	default?: true,
}
export function Generator({}: Props) {
	const { locale } = useLocale()
	const { version, changeVersion } = useVersion()

	const gen = getGenerator(getCurrentUrl())
	if (!gen) {
		return <main><ErrorPanel error={locale('generator.not_found', getCurrentUrl())} /></main>
	}

	const allowedVersions = useMemo(() => {
		return config.versions
			.filter(v => checkVersion(v.id, gen.minVersion, gen.maxVersion))
			.map(v => v.id as VersionId)
			.reverse()
	}, [gen.minVersion, gen.maxVersion])

	useTitle(locale('title.generator', locale(`generator.${gen.id}`)), allowedVersions)

	if (!checkVersion(version, gen.minVersion, gen.maxVersion)) {
		const lower = !checkVersion(version, gen.minVersion)
		const proposedVersion = (lower ? gen.minVersion : gen.maxVersion) as VersionId
		return <main>
			<ErrorPanel error={locale(`generator.error_${lower ? 'min' : 'max'}_version`, proposedVersion)} reportable={false}>
				<div class="error-actions">
					<div class="error-action" onClick={() => changeVersion(proposedVersion)}>
						{locale('generator.switch_version', proposedVersion)} {Octicon.arrow_right}
					</div>
					<div class="error-action" onClick={() => route('/generators')}>
						{locale('generator.browse_available', version)} {Octicon.arrow_right}
					</div>
				</div>
			</ErrorPanel>
		</main>
	}
	return <SchemaGenerator gen={gen} allowedVersions={allowedVersions} />
}

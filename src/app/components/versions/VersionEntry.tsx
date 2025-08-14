import { useLocale } from '../../contexts/index.js'
import type { VersionMeta } from '../../services/index.js'
import { releaseDate, VersionMetaData } from './index.js'

interface Props {
	version: VersionMeta,
	link?: string,
}
export function VersionEntry({ version, link }: Props) {
	const { locale } = useLocale()

	return <a class="version-entry" href={link}>
		<span class="version-id">{version.id}</span>
		<VersionMetaData label={locale('versions.released')} value={releaseDate(version)} compact />
		<VersionMetaData label={locale('versions.data_version')} value={version.data_version} optional />
		<VersionMetaData label={locale('versions.data_pack_format')} value={new Date(version.release_time) > new Date(2025, 6, 28) ? `${version.data_pack_version}.${version.data_pack_version_minor}` : version.data_pack_version} optional />
	</a>
}

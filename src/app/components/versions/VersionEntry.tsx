import { releaseDate, VersionMetaData } from '.'
import { useLocale } from '../../contexts'
import type { VersionMeta } from '../../services'

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
		<VersionMetaData label={locale('versions.pack_format')} value={version.data_pack_version} optional />
	</a>
}

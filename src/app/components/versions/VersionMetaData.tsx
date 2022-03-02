import { Octicon } from '..'

interface Props {
	label: string,
	value: string | number,
	link?: string,
	compact?: boolean,
	optional?: boolean,
}
export function VersionMetaData({ label, value, link, compact, optional }: Props) {
	return <div class={`version-metadata${optional ? ' version-metadata-hide' : ''}`}>
		<span class={compact ? 'version-metadata-hide' : undefined}>{label}: </span>
		<span class="version-metadata-value">{value}</span>
		{link && <a href={link} class="version-metadata-link">{Octicon.link_external}</a>}
	</div>
}

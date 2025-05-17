import { useMemo, useState } from 'preact/hooks'
import config from '../Config.js'
import { useLocale } from '../contexts/index.js'
import type { VersionId } from '../services/index.js'
import { Store } from '../Store.js'
import { Btn } from './Btn.js'
import { BtnMenu } from './BtnMenu.js'

interface Props {
	value?: VersionId,
	allowed?: VersionId[],
	hasAny?: boolean,
	onChange: (version: VersionId) => void,
	onAny?: () => void,
}
export function VersionSwitcher({ value, allowed, hasAny, onChange, onAny }: Props) {
	const { locale } = useLocale()

	const [showMore, setShowMore] = useState(false)

	const versions = useMemo(() => {
		if (allowed) {
			return allowed
				.map(a => config.versions.find(v => v.id === a)!)
				.filter(v => v !== undefined)
		}
		return [...config.versions].reverse()
	}, [allowed])

	const hasMoreVersions = useMemo(() => {
		return versions.some(v => !(v.show || v.id === value))
	}, [versions, value])

	const shownVersions = useMemo(() => {
		return versions.filter(v => v.show || v.id === value || showMore)
	}, [versions, showMore, value])

	return <BtnMenu class={`version-switcher${Store.getVersion() === null ? ' attention' : ''}`} icon="tag" label={value ?? locale('any_version')} tooltip={locale('switch_version')}>
		{hasAny && <Btn label={locale('any_version')} onClick={onAny} active={!value} />}
		{shownVersions.map(v => 
			<Btn label={v.name} active={v.id === value} onClick={() => onChange(v.id)} />)}
		{!showMore && hasMoreVersions && <Btn icon="chevron_down" label="More" onClick={e => {setShowMore(true);e.stopPropagation()}} />}
	</BtnMenu>
}

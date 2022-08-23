import { useMemo } from 'preact/hooks'
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

	const versions = useMemo(() => {
		if (allowed) return allowed
		return config.versions
			.map(v => v.id as VersionId)
			.reverse()
	}, [allowed])

	return <BtnMenu class={`version-switcher${Store.getVersion() === null ? ' attention' : ''}`} icon="tag" label={value ?? locale('any_version')} tooltip={locale('switch_version')}>
		{hasAny && <Btn label={locale('any_version')} onClick={onAny} active={!value} />}
		{versions.map((v: string) => 
			<Btn label={v} active={v === value} onClick={() => onChange(v as VersionId)} />)}
	</BtnMenu>
}

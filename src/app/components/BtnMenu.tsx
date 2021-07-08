import type { ComponentChildren } from 'preact'
import type { Octicon } from '.'
import { Btn } from '.'
import { useFocus } from '../hooks'

type BtnMenuProps = {
	icon?: keyof typeof Octicon,
	label?: string,
	relative?: boolean,
	children: ComponentChildren,
}
export function BtnMenu({ icon, label, relative, children }: BtnMenuProps) {
	const [active, setActive] = useFocus()

	return <div class={`btn-menu${relative === false ? ' no-relative' : ''}`}>
		<Btn icon={icon} label={label} onClick={setActive} />
		{active && <div class="btn-group">
			{children}
		</div>}
	</div>
}

import type { ComponentChildren } from 'preact'
import type { Octicon } from '.'
import { Btn } from '.'
import { useFocus } from '../hooks'

type BtnMenuProps = {
	icon?: keyof typeof Octicon,
	label?: string,
	relative?: boolean,
	tooltip?: string,
	children: ComponentChildren,
}
export function BtnMenu({ icon, label, relative, tooltip, children }: BtnMenuProps) {
	const [active, setActive] = useFocus()

	return <div class={`btn-menu${relative === false ? ' no-relative' : ''}`}>
		<Btn {...{icon, label, tooltip}} onClick={setActive} />
		{active && <div class="btn-group">
			{children}
		</div>}
	</div>
}

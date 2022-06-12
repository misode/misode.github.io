import type { ComponentChildren } from 'preact'
import type { Octicon } from '.'
import { Btn } from '.'
import { useFocus } from '../hooks'

interface BtnMenuProps extends JSX.HTMLAttributes<HTMLDivElement> {
	icon?: keyof typeof Octicon,
	label?: string,
	relative?: boolean,
	tooltip?: string,
	tooltipLoc?: 'se' | 'sw' | 'nw',
	children: ComponentChildren,
}
export function BtnMenu(props: BtnMenuProps) {
	const { icon, label, relative, tooltip, tooltipLoc, children } = props
	const [active, setActive] = useFocus()

	return <div {...props} class={`btn-menu${relative === false ? ' no-relative' : ''} ${props.class}`}>
		<Btn {...{icon, label, tooltip, tooltipLoc}} onClick={() => setActive()} />
		{active && <div class="btn-group">
			{children}
		</div>}
	</div>
}

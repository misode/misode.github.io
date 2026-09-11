import type { ComponentChildren } from 'preact'
import { useFocus } from '../hooks/index.js'
import type { Octicon } from './index.js'
import { Btn } from './index.js'

interface BtnMenuProps extends JSX.HTMLAttributes<HTMLDivElement> {
	icon?: keyof typeof Octicon,
	label?: string,
	relative?: boolean,
	tooltip?: string,
	tooltipLoc?: 'se' | 'sw' | 'nw',
	menuDir?: 'left' | 'right'
	children: ComponentChildren,
}
export function BtnMenu(props: BtnMenuProps) {
	const { icon, label, relative, tooltip, tooltipLoc, menuDir, children } = props
	const [active, setActive] = useFocus()

	return <div {...props} class={`btn-menu${relative === false ? ' no-relative' : ''} ${props.class}`} >
		<Btn {...{icon, label, tooltip, tooltipLoc}} onClick={() => setActive()} />
		{active && <div class="btn-group" style={menuDir === 'right' ? 'left:0;right:unset' : 'right:0;left:unset'}>
			{children}
		</div>}
	</div>
}

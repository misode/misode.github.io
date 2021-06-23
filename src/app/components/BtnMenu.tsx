import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import type { Octicon } from '.'
import { Btn } from '.'

type BtnMenuProps = {
	icon?: keyof typeof Octicon,
	label?: string,
	relative?: boolean,
	children: ComponentChildren,
}
export function BtnMenu({ icon, label, relative, children }: BtnMenuProps) {
	const [active, setActive] = useState(false)

	const hider = () => {
		setActive(false)
	}

	useEffect(() => {
		if (active) {
			document.body.addEventListener('click', hider)
		}
		return () => {
			document.body.removeEventListener('click', hider)
		}
	}, [active])

	return <div class={`btn-menu${relative === false ? ' no-relative' : ''}`}>
		<Btn icon={icon} label={label} onClick={() => setActive(true)} />
		{active && <div class="btn-group">
			{children}
		</div>}
	</div>
}

import type { ColormapType } from '../../previews/Colormap.js'
import { ColormapTypes } from '../../previews/Colormap.js'
import { Btn } from '../Btn.jsx'
import { BtnMenu } from '../BtnMenu.jsx'

interface Props {
	value: ColormapType,
	onChange: (value: ColormapType) => void,
}
export function ColormapSelector({ value, onChange }: Props) {
	return <BtnMenu icon="flame">
		{ColormapTypes.map(type => <Btn label={type} onClick={() => onChange(type)} active={value === type} />)}
	</BtnMenu>
}

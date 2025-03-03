import { appRoute } from '../App.jsx'

interface Props {
	path: string
}
export function LegacyPartners({ path }: Props) {
	appRoute(path.replace('/partners/', '/'))

	return null
}

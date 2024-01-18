import { route } from 'preact-router'

interface Props {
	path: string
}
export function LegacyPartners({ path }: Props) {
	route(path.replace('/partners/', '/'))

	return null
}

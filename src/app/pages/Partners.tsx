import { Footer, GeneratorList } from '../components/index.js'
import { useLocale, useTitle } from '../contexts/index.js'

interface Props {
	path?: string
}
export function Partners({}: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.partners'))

	return <main>
		<div class="container">
			<GeneratorList predicate={gen => gen.partner !== undefined} />
		</div>
		<Footer donate={false} />
	</main>
}

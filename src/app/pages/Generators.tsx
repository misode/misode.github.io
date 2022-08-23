import { Footer, GeneratorList } from '../components/index.js'
import { useLocale, useTitle } from '../contexts/index.js'

interface Props {
	path?: string
}
export function Generators({}: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.generators'))

	return <main>
		<div class="container">
			<GeneratorList predicate={gen => !gen.partner} />
		</div>
		<Footer />
	</main>
}

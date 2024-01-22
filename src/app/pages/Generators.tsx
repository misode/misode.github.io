import { Footer, GeneratorList } from '../components/index.js'
import { useLocale, useTitle } from '../contexts/index.js'

interface Props {
	path?: string
}
export function Generators({}: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.generators'))

	return <main>
		<div class="legacy-container">
			<GeneratorList predicate={gen => !gen.tags?.includes('partners')} />
		</div>
		<Footer />
	</main>
}

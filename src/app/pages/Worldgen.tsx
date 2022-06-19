import { Footer, GeneratorList } from '../components/index.js'
import { useLocale, useTitle } from '../contexts/index.js'

interface Props {
	path?: string
}
export function Worldgen({}: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.generator_category', locale('worldgen')))

	return <main>
		<div class="container">
			<GeneratorList predicate={gen => gen.category === 'worldgen'} />
		</div>
		<Footer />
	</main>
}

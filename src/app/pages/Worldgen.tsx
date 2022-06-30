import { Footer, GeneratorList } from '../components/index.js'
import { useLocale, useTitle } from '../contexts/index.js'

interface Props {
	path?: string
}
export function Worldgen({}: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.worldgen'))

	return <main>
		<div class="container worldgen">
			<GeneratorList predicate={gen => {
				console.log(gen.tags, gen.tags?.includes('worldgen'))
				return gen.tags?.includes('worldgen')
			}} />
		</div>
		<Footer />
	</main>
}

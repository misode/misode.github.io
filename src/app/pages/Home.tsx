import { Footer, GeneratorCard, ToolGroup } from '../components/index.js'
import { useLocale, useTitle } from '../contexts/index.js'
import { useMediaQuery } from '../hooks/useMediaQuery.js'

interface Props {
	path?: string
}
export function Home({}: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.home'))

	const smallScreen = useMediaQuery('(max-width: 580px)')

	return (
		<main>
			<div class='legacy-container'>
				<div class='card-group'>
					{smallScreen ? (
						/* mobile */ <>
							<AvailableGenerators />
						</>
					) : (
						/* desktop */ <>
							<div class='card-column'>
								<AvailableGenerators />
							</div>
						</>
					)}
				</div>
				<Footer />
			</div>
		</main>
	)
}

function AvailableGenerators() {
	const { locale } = useLocale()
	return (
		<ToolGroup
			title={locale('generators.popular')}
			link='/generators/'
		>
			<GeneratorCard
				minimal
				id='shardborne.custom_npc'
			/>
			<GeneratorCard
				minimal
				id='worldgen/processor_list'
			/>
			<GeneratorCard
				minimal
				id='worldgen/template_pool'
			/>
		</ToolGroup>
	)
}

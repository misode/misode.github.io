import { route } from 'preact-router'
import { useMemo } from 'preact/hooks'
import config from '../../config.json'
import { Ad, TreeView } from '../components'
import { getFilePath, useLocale, useProject, useTitle } from '../contexts'

interface Props {
	path?: string,
}
export function Project({}: Props) {
	const { locale } = useLocale()
	const { project } = useProject()
	useTitle(locale('title.project', project.name))
	const entries = useMemo(() => project.files.map(getFilePath), project.files)

	const openFile = (entry: string) => {
		// const [_data, _namespace, type, ..._id] = entry.split('/')
		const type = entry.split('/')[2]
		const gen = config.generators.find(g => (g.path ?? g.id) === type)
		if (!gen) {
			throw new Error(`Cannot find generator of type ${type}`)
		}
		route(gen?.url)
		// TODO: select file using namespace and id
	}

	return <main>
		<Ad id="data-pack-project" type="text" />
		<div class="project">
			<h2>{project.name}</h2>
			<div class="file-view">
				<TreeView entries={entries} onSelect={openFile}/>
			</div>
		</div>
	</main>
}

import { route } from 'preact-router'
import { useMemo } from 'preact/hooks'
import config from '../../config.json'
import { Ad, TreeView } from '../components'
import type { Project } from '../services'
import { getFilePath } from '../services'

interface Props {
	path?: string,
	project: Project,
}
export function Project({ project }: Props) {
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

import { useMemo } from 'preact/hooks'
import { Ad, BtnLink, TreeView } from '../components'
import { disectFilePath, getFilePath, useLocale, useProject, useTitle } from '../contexts'

interface Props {
	path?: string,
}
export function Project({}: Props) {
	const { locale } = useLocale()
	const { project, openFile } = useProject()
	useTitle(locale('title.project', project.name))
	const entries = useMemo(() => project.files.map(getFilePath), project.files)

	const selectFile = (entry: string) => {
		const file = disectFilePath(entry)
		if (file) {
			openFile(file.type, file.id)
		}
	}

	return <main>
		<Ad id="data-pack-project" type="text" />
		<div class="project-navigation">
			<BtnLink link="/project/new/" icon="plus_circle" label="New project" />
		</div>
		<div class="project">
			<h2>{project.name}</h2>
			<div class="file-view">
				{entries.length === 0
					? <span>{locale('project.no_files')}</span>
					: <TreeView entries={entries} onSelect={selectFile}/>}
			</div>
		</div>
	</main>
}

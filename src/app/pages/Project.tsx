import { useCallback, useMemo } from 'preact/hooks'
import { Ad, TreeView } from '../components'
import { getFilePath, useLocale, useProject, useTitle } from '../contexts'

interface Props {
	path?: string,
}
export function Project({}: Props) {
	const { locale } = useLocale()
	const { project, openFile } = useProject()
	useTitle(locale('title.project', project.name))
	const entries = useMemo(() => project.files.flatMap(f => {
		const path = getFilePath(f)
		return path ? [path] : []
	}), project.files)

	const selectFile = useCallback((entry: string) => {
		const [, namespace, type, ...id] = entry.split('/')
		openFile(type, `${namespace}:${id}`)
	}, [openFile])

	return <main>
		<Ad id="data-pack-project" type="text" />
		<div class="project">
			<h2>{project.name}</h2>
			<div class="file-view">
				<TreeView entries={entries} onSelect={selectFile}/>
			</div>
		</div>
	</main>
}

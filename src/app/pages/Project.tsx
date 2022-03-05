import { useMemo, useRef } from 'preact/hooks'
import { Ad, Btn, BtnLink, TreeView } from '../components'
import { disectFilePath, getFilePath, useLocale, useProject, useTitle } from '../contexts'
import { Store } from '../Store'
import { writeZip } from '../Utils'

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

	const download = useRef<HTMLAnchorElement>()

	const onDownload = () => {
		const entries = project.files.map(file => {
			const path = getFilePath(file)
			return [`${path}.json`, JSON.stringify(file.data, null, Store.getIndent())] as [string, string]
		})
		if (project.meta) {
			entries.push(['pack.mcmeta', JSON.stringify(project.meta, null, Store.getIndent())])
		}
		writeZip(entries).then(url => {
			download.current.setAttribute('href', url)
			download.current.setAttribute('download', `${project.name.replaceAll(' ', '_')}.zip`)
			download.current.click()
		})
	}

	return <main>
		<Ad id="data-pack-project" type="text" />
		<div class="project-navigation">
			<BtnLink icon="plus_circle" label="New project" link="/project/new/" />
			<Btn icon="download" label="Download" onClick={onDownload} />
		</div>
		<div class="project">
			<h2>{project.name}</h2>
			<div class="file-view">
				{entries.length === 0
					? <span>{locale('project.no_files')}</span>
					: <TreeView entries={entries} onSelect={selectFile}/>}
			</div>
		</div>
		<a ref={download} style="display: none;"></a>
	</main>
}

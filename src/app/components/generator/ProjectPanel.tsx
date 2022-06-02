import type { DataModel } from '@mcschema/core'
import { useMemo, useRef } from 'preact/hooks'
import { disectFilePath, getFilePath, useLocale, useProject } from '../../contexts'
import type { VersionId } from '../../services'
import { stringifySource } from '../../services'
import { writeZip } from '../../Utils'
import { Btn } from '../Btn'
import { BtnMenu } from '../BtnMenu'
import { TreeView } from '../TreeView'

interface Props {
	model: DataModel | undefined,
	version: VersionId,
	id: string,
	onError: (message: string) => unknown,
}
export function ProjectPanel({}: Props) {
	const { locale } = useLocale()
	const { projects, project, changeProject, file, openFile } = useProject()

	const entries = useMemo(() => project.files.flatMap(f => {
		const path = getFilePath(f)
		return path ? [path] : []
	}), project.files)

	const selected = useMemo(() => file && getFilePath(file), [file])

	const selectFile = (entry: string) => {
		const file = disectFilePath(entry)
		if (file) {
			openFile(file.type, file.id)
		}
	}

	const download = useRef<HTMLAnchorElement>(null)

	const onDownload = async () => {
		if (!download.current) return
		const entries = project.files.flatMap(file => {
			const path = getFilePath(file)
			if (path === undefined) return []
			return [[path, stringifySource(file.data)]] as [string, string][]
		})
		const url = await writeZip(entries)
		download.current.setAttribute('href', url)
		download.current.setAttribute('download', `${project.name.replaceAll(' ', '_')}.zip`)
		download.current.click()
	}

	return <>
		<div class="project-controls">
			<BtnMenu icon="chevron_down" label={project.name}>
				{projects.map(p => <Btn label={p.name} onClick={() => changeProject(p.name)} />)}
			</BtnMenu>
			<BtnMenu icon="kebab_horizontal" >
				<Btn icon="file_zip" label={locale('project.download')} onClick={onDownload} />
			</BtnMenu>
		</div>
		<div class="file-view">
			{entries.length === 0
				? <span>{locale('project.no_files')}</span>
				: <TreeView entries={entries} selected={selected} onSelect={selectFile} />}
		</div>
		<a ref={download} style="display: none;"></a>
	</>
}

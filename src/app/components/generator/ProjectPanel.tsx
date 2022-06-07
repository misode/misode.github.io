import type { DataModel } from '@mcschema/core'
import { useMemo, useRef } from 'preact/hooks'
import { Analytics } from '../../Analytics'
import { disectFilePath, getFilePath, useLocale, useProject } from '../../contexts'
import type { VersionId } from '../../services'
import { stringifySource } from '../../services'
import { writeZip } from '../../Utils'
import { Btn } from '../Btn'
import { BtnMenu } from '../BtnMenu'
import type { EntryAction } from '../TreeView'
import { TreeView } from '../TreeView'

interface Props {
	model: DataModel | undefined,
	version: VersionId,
	id: string,
	onError: (message: string) => unknown,
	onRename: (file: { type: string, id: string }) => unknown,
	onCreate: () => unknown,
}
export function ProjectPanel({ onRename, onCreate }: Props) {
	const { locale } = useLocale()
	const { projects, project, changeProject, file, openFile, updateFile } = useProject()

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

	const actions = useMemo<EntryAction[]>(() => [
		{
			icon: 'pencil',
			label: locale('project.rename_file'),
			onAction: (e) => {
				const file = disectFilePath(e)
				if (file) {
					onRename(file)
				}
			},
		},
		{
			icon: 'trashcan',
			label: locale('project.delete_file'),
			onAction: (e) => {
				const file = disectFilePath(e)
				if (file) {
					Analytics.deleteProjectFile(file.type, projects.length, project.files.length, 'menu')
					updateFile(file.type, file.id, {})
				}
			},
		},
	], [updateFile, onRename])

	return <>
		<div class="project-controls">
			<BtnMenu icon="chevron_down" label={project.name}>
				{projects.map(p => <Btn label={p.name} active={p.name === project.name} onClick={() => changeProject(p.name)} />)}
			</BtnMenu>
			<BtnMenu icon="kebab_horizontal" >
				<Btn icon="file_zip" label={locale('project.download')} onClick={onDownload} />
				<Btn icon="plus_circle" label={locale('project.new')} onClick={onCreate} />
			</BtnMenu>
		</div>
		<div class="file-view">
			{entries.length === 0
				? <span>{locale('project.no_files')}</span>
				: <TreeView entries={entries} selected={selected} onSelect={selectFile} actions={actions} />}
		</div>
		<a ref={download} style="display: none;"></a>
	</>
}

import type { DataModel } from '@mcschema/core'
import { useCallback, useMemo, useRef, useState } from 'preact/hooks'
import { Analytics } from '../../Analytics.js'
import config from '../../Config.js'
import { disectFilePath, DRAFT_PROJECT, getFilePath, useLocale, useProject, useVersion } from '../../contexts/index.js'
import type { VersionId } from '../../services/index.js'
import { stringifySource } from '../../services/index.js'
import { Store } from '../../Store.js'
import { writeZip } from '../../Utils.js'
import { Btn } from '../Btn.js'
import { BtnMenu } from '../BtnMenu.js'
import type { EntryAction } from '../TreeView.js'
import { TreeView } from '../TreeView.js'

interface Props {
	model: DataModel | undefined,
	version: VersionId,
	id: string,
	onError: (message: string) => unknown,
	onRename: (file: { type: string, id: string }) => unknown,
	onCreate: () => unknown,
	onDeleteProject: () => unknown,
}
export function ProjectPanel({ onRename, onCreate, onDeleteProject }: Props) {
	const { locale } = useLocale()
	const { version } = useVersion()
	const { projects, project, changeProject, file, openFile, updateFile } = useProject()

	const [treeViewMode, setTreeViewMode] = useState(Store.getTreeViewMode())

	const changeTreeViewMode = useCallback((mode: string) => {
		Store.setTreeViewMode(mode)
		Analytics.setTreeViewMode(mode)
		setTreeViewMode(mode)
	}, [])

	const disectEntry = useCallback((entry: string) => {
		if (treeViewMode === 'resources' && entry !== 'pack.mcmeta') {
			const [type, id] = entry.split('/')
			return {
				type: type.replaceAll('\u2215', '/'),
				id: id.replaceAll('\u2215', '/'),
			}
		}
		return disectFilePath(entry)
	}, [treeViewMode])

	const entries = useMemo(() => project.files.flatMap(f => {
		const path = getFilePath(f)
		if (!path) return []
		if (f.type === 'pack_mcmeta') return 'pack.mcmeta'
		if (treeViewMode === 'resources') {
			return [`${f.type.replaceAll('/', '\u2215')}/${f.id.replaceAll('/', '\u2215')}`]
		}
		return [path]
	}), [treeViewMode, ...project.files])

	const selected = useMemo(() => file && getFilePath(file), [file])

	const selectFile = useCallback((entry: string) => {
		const file = disectEntry(entry)
		if (file) {
			openFile(file.type, file.id)
		}
	}, [disectEntry])

	const download = useRef<HTMLAnchorElement>(null)

	const onDownload = async () => {
		if (!download.current) return
		let hasPack = false
		const entries = project.files.flatMap(file => {
			const path = getFilePath(file)
			if (path === undefined) return []
			if (path === 'pack.mcmeta') hasPack = true
			return [[path, stringifySource(file.data)]] as [string, string][]
		})
		if (!hasPack) {
			const pack_format = config.versions.find(v => v.id === version)!.pack_format
			entries.push(['pack.mcmeta', stringifySource({ pack: { pack_format, description: '' } })])
		}
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
				const file = disectEntry(e)
				if (file) {
					onRename(file)
				}
			},
		},
		{
			icon: 'trashcan',
			label: locale('project.delete_file'),
			onAction: (e) => {
				const file = disectEntry(e)
				if (file) {
					Analytics.deleteProjectFile(file.type, projects.length, project.files.length, 'menu')
					updateFile(file.type, file.id, {})
				}
			},
		},
	], [disectEntry, updateFile, onRename])

	return <>
		<div class="project-controls">
			<BtnMenu icon="chevron_down" label={project.name} tooltip={locale('switch_project')} tooltipLoc="se">
				{projects.map(p => <Btn label={p.name} active={p.name === project.name} onClick={() => changeProject(p.name)} />)}
			</BtnMenu>
			<BtnMenu icon="kebab_horizontal" >
				<Btn icon="file_zip" label={locale('project.download')} onClick={onDownload} />
				<Btn icon="plus_circle" label={locale('project.new')} onClick={onCreate} />
				<Btn icon={treeViewMode === 'resources' ? 'three_bars' : 'rows'} label={locale(treeViewMode === 'resources' ? 'project.show_file_paths' : 'project.show_resources')} onClick={() => changeTreeViewMode(treeViewMode === 'resources' ? 'files' : 'resources')} />
				{project.name !== DRAFT_PROJECT.name && <Btn icon="trashcan" label={locale('project.delete')} onClick={onDeleteProject} />}
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

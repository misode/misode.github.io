import { route } from 'preact-router'
import { useCallback, useMemo, useRef } from 'preact/hooks'
import config from '../../Config.js'
import { DRAFT_PROJECT, getProjectRoot, useLocale, useProject } from '../../contexts/index.js'
import { useModal } from '../../contexts/Modal.jsx'
import { useSpyglass } from '../../contexts/Spyglass.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useFocus } from '../../hooks/useFocus.js'
import { cleanUrl, writeZip } from '../../Utils.js'
import { Btn } from '../Btn.js'
import { BtnMenu } from '../BtnMenu.js'
import { Octicon } from '../Octicon.jsx'
import type { TreeViewGroupRenderer, TreeViewLeafRenderer } from '../TreeView.js'
import { TreeView } from '../TreeView.js'
import { FileRenaming } from './FileRenaming.jsx'
import { ProjectCreation } from './ProjectCreation.jsx'
import { ProjectDeletion } from './ProjectDeletion.jsx'

export function ProjectPanel() {
	const { locale } = useLocale()
	const { showModal } = useModal()
	const { projects, project, projectUri, setProjectUri, changeProject } = useProject()
	const { client, service } = useSpyglass()

	const projectRoot = getProjectRoot(project)

	const { value: entries } = useAsync(async () => {
		const entries = await client.fs.readdir(projectRoot)
		return entries.flatMap(e => {
			return e.name.startsWith(projectRoot) ? [e.name.slice(projectRoot.length)] : []
		})
	}, [project])

	const download = useRef<HTMLAnchorElement>(null)

	const onDownload = async () => {
		if (!download.current || entries === undefined) return
		const zipEntries = await Promise.all(entries.map(async e => {
			const data = await client.fs.readFile(projectRoot + e)
			const text = new TextDecoder().decode(data)
			return [e, text] as [string, string]
		}))
		const url = await writeZip(zipEntries)
		download.current.setAttribute('href', url)
		download.current.setAttribute('download', `${project.name.replaceAll(' ', '_')}.zip`)
		download.current.click()
	}

	const onDeleteProject = useCallback(() => {
		showModal(() => <ProjectDeletion />)
	}, [])

	const onCreateProject = useCallback(() => {
		showModal(() => <ProjectCreation />)
	}, [])

	const actions = useMemo(() => [
		{
			icon: 'pencil',
			label: locale('project.rename_file'),
			onAction: (uri: string) => {
				showModal(() => <FileRenaming uri={uri} />)
			},
		},
		{
			icon: 'trashcan',
			label: locale('project.delete_file'),
			onAction: (uri: string) => {
				client.fs.unlink(uri).then(() => {
					setProjectUri(undefined)
				})
			},
		},
	], [client, projectRoot, showModal])

	const FolderEntry: TreeViewGroupRenderer = useCallback(({ name, open, onClick }) => {
		return <div class="entry" onClick={onClick} >
			{Octicon[!open ? 'chevron_right' : 'chevron_down']}
			<span class="overflow-hidden text-ellipsis whitespace-nowrap">{name}</span>
		</div>
	}, [])

	const FileEntry: TreeViewLeafRenderer<string> = useCallback(({ entry }) => {
		const [focused, setFocus] = useFocus()
		const uri = projectRoot + entry
		const onContextMenu = (evt: MouseEvent) => {
			evt.preventDefault()
			setFocus()
		}
		const onClick = () => {
			const category = uri.endsWith('/pack.mcmeta')
				? 'pack_mcmeta'
				: service?.dissectUri(uri)?.category
			const gen = config.generators.find(g => g.id === category)
			if (!gen) {
				throw new Error(`Cannot find generator for uri ${uri}`)
			}
			route(cleanUrl(gen.url))
			setProjectUri(uri)
		}

		return <div class={`entry ${uri === projectUri ? 'active' : ''} ${focused ? 'focused' : ''}`} onClick={onClick} onContextMenu={onContextMenu} >
			{Octicon.file}
			<span>{entry.split('/').at(-1)}</span>
			{focused && <div class="entry-menu">
				{actions?.map(a => <div class="action [&>svg]:inline" onClick={e => { a.onAction(uri); e.stopPropagation(); setFocus(false) }}>
					{(Octicon as any)[a.icon]}
					<span>{a.label}</span>
				</div>)}
			</div>}
		</div>
	}, [service, actions, projectRoot, projectUri])

	return <>
		<div class="project-controls">
			<BtnMenu icon="chevron_down" label={project.name} tooltip={locale('switch_project')} tooltipLoc="se">
				{projects.map(p => <Btn label={p.name} active={p.name === project.name} onClick={() => changeProject(p.name)} />)}
			</BtnMenu>
			<BtnMenu icon="kebab_horizontal" >
				<Btn icon="file_zip" label={locale('project.download')} onClick={onDownload} />
				<Btn icon="plus_circle" label={locale('project.new')} onClick={onCreateProject} />
				{project.name !== DRAFT_PROJECT.name && <Btn icon="trashcan" label={locale('project.delete')} onClick={onDeleteProject} />}
			</BtnMenu>
		</div>
		<div class="file-view">
			{entries === undefined
				? <></>
				: entries.length === 0
					? <span>{locale('project.no_files')}</span>
					: <TreeView entries={entries} split={path => path.split('/')} group={FolderEntry} leaf={FileEntry} />}
		</div>
		<a ref={download} style="display: none;"></a>
	</>
}

import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import config from '../../Config.js'
import type { Project } from '../../contexts/index.js'
import { disectFilePath, useLocale, useProject } from '../../contexts/index.js'
import type { VersionId } from '../../services/index.js'
import { DEFAULT_VERSION, parseSource } from '../../services/index.js'
import { message, readZip } from '../../Utils.js'
import { Btn, BtnMenu, FileUpload, Octicon, TextInput } from '../index.js'
import { Modal } from '../Modal.js'

interface Props {
	onClose: () => unknown,
}
export function ProjectCreation({ onClose }: Props) {
	const { locale } = useLocale()
	const { projects, createProject, changeProject, updateProject } = useProject()

	const [name, setName] = useState('')
	const [namespace, setNamespace] = useState('')
	const [version, setVersion] = useState(DEFAULT_VERSION)
	const [file, setFile] = useState<File | undefined>(undefined)
	const [creating, setCreating] = useState(false)

	const onUpload = (file: File) => {
		if (file.type.match(/^application\/(x-)?zip(-compressed)?$/)) {
			if (name.length === 0) {
				setName(file.name
					.replace(/\.zip$/, '')
					.replaceAll(/[ _-]+/g, ' '))
			}
			setFile(file)
		}
	}

	const projectUpdater = useRef(updateProject)
	useEffect(() => {
		projectUpdater.current = updateProject
	}, [updateProject])

	const onCreate = () => {
		setCreating(true)
		createProject(name, namespace || undefined, version)
		changeProject(name)
		if (file) {
			readZip(file).then(async (entries) => {
				const project: Partial<Project> = { files: [] }
				await Promise.all(entries.map(async (entry) => {
					const file = disectFilePath(entry[0], version)
					if (file) {
						try {
							const data = await parseSource(entry[1], 'json')
							project.files!.push({ ...file, data })
						} catch (e) {
							console.error(`Failed parsing ${file.type} ${file.id}: ${message(e)}`)
						}
					}
				}))
				projectUpdater.current(project)
				onClose()
			}).catch(() => {
				onClose()
			})
		} else {
			onClose()
		}
	}

	const invalidName = useMemo(() => {
		return projects.map(p => p.name.trim().toLowerCase()).includes(name.trim().toLowerCase())
	}, [projects, name])

	const invalidNamespace = useMemo(() => {
		return !(namespace.length === 0 || namespace.match(/^(?:[a-z0-9._-]+:)?[a-z0-9/._-]+$/))
	}, [namespace])

	const versions = config.versions.map(v => v.id as VersionId).reverse()

	return <Modal class="project-creation" onDismiss={onClose}>
		<p>{locale('project.create')}</p>
		<div class="input-group">
			<TextInput autofocus class={`btn btn-input${!creating && (invalidName || name.length === 0) ? ' invalid': ''}`} placeholder={locale('project.name')} value={name} onChange={setName} />
			{!creating && invalidName && <div class="status-icon danger tooltipped tip-e" aria-label={locale('project.name.already_exists')}>{Octicon.issue_opened}</div>}
		</div>
		<div class="input-group">
			<TextInput class={`btn btn-input${!creating && invalidNamespace ? ' invalid' : ''}`} placeholder={locale('project.namespace')} value={namespace} onChange={setNamespace} />
			{!creating && invalidNamespace && <div class="status-icon danger tooltipped tip-e" aria-label={locale('project.namespace.invalid')}>{Octicon.issue_opened}</div>}
		</div>
		<BtnMenu icon="tag" label={version} tooltip={locale('switch_version')} data-cy="version-switcher">
			{versions.map(v =>
				<Btn label={v} active={v === version} onClick={() => setVersion(v)} />
			)}
		</BtnMenu>
		<FileUpload value={file} onChange={onUpload} label={locale('choose_zip_file')} accept=".zip"/>
		<Btn icon="rocket" label="Create!" disabled={creating || invalidName || name.length === 0 || invalidNamespace} onClick={onCreate} />
	</Modal>
}

import { route } from 'preact-router'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { Btn, BtnMenu, FileUpload, Octicon, TextInput } from '..'
import config from '../../../config.json'
import type { Project } from '../../contexts'
import { disectFilePath, useLocale, useProject } from '../../contexts'
import type { VersionId } from '../../services'
import { DEFAULT_VERSION, parseSource } from '../../services'
import { readZip } from '../../Utils'

interface Props {
	path?: string,
}
export function NewProject({}: Props) {
	const { locale } = useLocale()
	const { projects, createProject, changeProject, updateProject } = useProject()

	const [name, setName] = useState('')
	const [namespace, setNamespace] = useState('')
	const [version, setVersion] = useState(DEFAULT_VERSION)
	const [file, setFile] = useState<File | undefined>(undefined)

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
		createProject(name, namespace || undefined, version)
		changeProject(name)
		if (file) {
			readZip(file).then((entries) => {
				const project: Partial<Project> = { files: [] }
				entries.forEach((entry) => {
					const file = disectFilePath(entry[0])
					if (file) {
						const data = parseSource(entry[1], 'json')
						project.files!.push({ ...file, data })
					}
				})
				projectUpdater.current(project)
				route('/project/')
			})
		} else {
			route('/project/')
		}
	}

	const invalidName = useMemo(() => {
		return projects.map(p => p.name.trim().toLowerCase()).includes(name.trim().toLowerCase())
	}, [projects, name])

	const invalidNamespace = useMemo(() => {
		return !(namespace.length === 0 || namespace.match(/^(?:[a-z0-9._-]+:)?[a-z0-9/._-]+$/))
	}, [namespace])

	const versions = config.versions.map(v => v.id as VersionId).reverse()

	return <div class="project">
		<div class="project-creation">
			<div class="input-group">
				<TextInput class={`btn btn-input${invalidName || name.length === 0 ? ' invalid': ''}`} placeholder={locale('project.name')} value={name} onChange={setName} />
				{invalidName && <div class="status-icon danger tooltipped tip-e" aria-label="There already exists a project with this name">{Octicon.issue_opened}</div>}
			</div>
			<div class="input-group">
				<TextInput class={`btn btn-input${invalidNamespace ? ' invalid' : ''}`} placeholder={locale('project.namespace')} value={namespace} onChange={setNamespace} />
			</div>
			<BtnMenu icon="tag" label={version} tooltip={locale('switch_version')} data-cy="version-switcher">
				{versions.map(v =>
					<Btn label={v} active={v === version} onClick={() => setVersion(v)} />
				)}
			</BtnMenu>
			<FileUpload value={file} onChange={onUpload} label={locale('choose_zip_file')} accept=".zip"/>
			<Btn icon="rocket" label="Create!" disabled={invalidName || name.length === 0 || invalidNamespace} onClick={onCreate} />
		</div>
	</div>
}

import { useCallback, useMemo, useState } from 'preact/hooks'
import config from '../../Config.js'
import { useLocale, useProject } from '../../contexts/index.js'
import { useModal } from '../../contexts/Modal.jsx'
import { useSpyglass } from '../../contexts/Spyglass.jsx'
import type { VersionId } from '../../services/index.js'
import { DEFAULT_VERSION } from '../../services/index.js'
import { PROJECTS_URI } from '../../services/Spyglass.js'
import { hexId, message, readZip } from '../../Utils.js'
import { Btn, BtnMenu, FileUpload, Octicon, TextInput } from '../index.js'
import { Modal } from '../Modal.js'

function isAppleDoubleFile(data: Uint8Array): boolean {
    return (
        data.length >= 4 &&
        data[0] === 0x00 &&
        data[1] === 0x05 &&
        data[2] === 0x16 &&
        data[3] === 0x07
    )
}

function isMacOSMetadataEntry(path: string, data: Uint8Array): boolean {
    const normalizedPath = path.replace(/\\/g, '/')
    const segments = normalizedPath.split('/')
    const filename = segments[segments.length - 1]

    const isKnownMetadataName =
        filename === '.DS_Store' ||
        filename.startsWith('._')

    return isKnownMetadataName && isAppleDoubleFile(data)
}

export function ProjectCreation() {
	const { locale } = useLocale()
	const { hideModal } = useModal()
	const { projects, createProject, changeProject } = useProject()
	const { client } = useSpyglass()

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

	const onCreate = useCallback(async () => {
		setCreating(true)
		const rootUri = `${PROJECTS_URI}${hexId()}/`
		await client.fs.mkdir(rootUri)
		createProject({ name, namespace, version, storage: { type: 'indexeddb', rootUri } })
		changeProject(name)
		if (file) {
			
       readZip(file).then(async (entries) => {
		   const filteredEntries = entries.filter(
			   ([entryName, data]) => !isMacOSMetadataEntry(entryName, data))

        await Promise.all(filteredEntries.map(([entryName, data]) => {
        const path = entryName.startsWith('/')
            ? entryName.slice(1)
            : entryName

            return client.fs.writeFile(rootUri + path, data)
            }))

               hideModal()

			}).catch((e) => {
				// TODO: handle errors
				console.warn(`Error importing data pack: ${message(e)}`)
				hideModal()
			})
		} else {
			hideModal()
		}
	}, [createProject, changeProject, client, version, name, namespace, file])

	const invalidName = useMemo(() => {
		return projects.map(p => p.name.trim().toLowerCase()).includes(name.trim().toLowerCase())
	}, [projects, name])

	const invalidNamespace = useMemo(() => {
		return !(namespace.length === 0 || namespace.match(/^(?:[a-z0-9._-]+:)?[a-z0-9/._-]+$/))
	}, [namespace])

	const versions = config.versions.map(v => v.id as VersionId).reverse()

	return <Modal class="project-creation">
		<p>{locale('project.create')}</p>
		<div class="input-group">
			<TextInput autofocus class={`btn btn-input${!creating && (invalidName || name.length === 0) ? ' invalid': ''}`} placeholder={locale('project.name')} value={name} onChange={setName} />
			{!creating && invalidName && <div class="status-icon danger tooltipped tip-e" aria-label={locale('project.name.already_exists')}>{Octicon.issue_opened}</div>}
		</div>
		<div class="input-group">
			<TextInput class={`btn btn-input${!creating && invalidNamespace ? ' invalid' : ''}`} placeholder={locale('project.namespace')} value={namespace} onChange={setNamespace} />
			{!creating && invalidNamespace && <div class="status-icon danger tooltipped tip-e" aria-label={locale('project.namespace.invalid')}>{Octicon.issue_opened}</div>}
		</div>
		<BtnMenu icon="tag" label={version} tooltip={locale('switch_version')}>
			{versions.map(v =>
				<Btn label={v} active={v === version} onClick={() => setVersion(v)} />
			)}
		</BtnMenu>
		<FileUpload value={file} onChange={onUpload} label={locale('choose_zip_file')} accept=".zip"/>
		<Btn icon="rocket" label="Create!" disabled={creating || invalidName || name.length === 0 || invalidNamespace} onClick={onCreate} />
	</Modal>
}

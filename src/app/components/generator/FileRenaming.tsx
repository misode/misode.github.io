import { useState } from 'preact/hooks'
import { Analytics } from '../../Analytics.js'
import { useLocale, useProject } from '../../contexts/index.js'
import { Btn } from '../Btn.js'
import { TextInput } from '../forms/index.js'
import { Modal } from '../Modal.js'

interface Props {
	id: string,
	name: string,
	onClose: () => void,
}
export function FileRenaming({ id, name, onClose }: Props) {
	const { locale } = useLocale()
	const { projects, project, updateFile } = useProject()
	const [fileId, setFileId] = useState(name)
	const [error, setError] = useState<string>()

	const changeFileId = (str: string) => {
		setError(undefined)
		setFileId(str)
	}

	const doSave = () => {
		if (!fileId.match(/^([a-z0-9_.-]+:)?[a-z0-9/_.-]+$/)) {
			setError('Invalid resource location')
			return
		}
		Analytics.renameProjectFile(id, projects.length, project.files.length, 'menu')
		updateFile(id, name, { type: id, id: fileId })
		onClose()
	}

	return <Modal class="file-modal" onDismiss={onClose}>
		<p>{locale('project.rename_file')}</p>
		<TextInput autofocus class="btn btn-input" value={fileId} onChange={changeFileId} onEnter={doSave} onCancel={onClose} placeholder={locale('resource_location')} spellcheck={false} />
		{error !== undefined && <span class="invalid">{error}</span>}
		<Btn icon="pencil" label={locale('project.rename')} onClick={doSave} />
	</Modal>
}

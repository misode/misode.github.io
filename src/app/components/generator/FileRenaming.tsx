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

	const doSave = () => {
		Analytics.renameProjectFile(id, projects.length, project.files.length, 'menu')
		updateFile(id, name, { type: id, id: fileId })
		onClose()
	}

	return <Modal class="file-modal" onDismiss={onClose}>
		<p>{locale('project.rename_file')}</p>
		<TextInput autofocus class="btn btn-input" value={fileId} onChange={setFileId} onEnter={doSave} placeholder={locale('resource_location')} spellcheck={false} />
		<Btn icon="pencil" label={locale('project.rename')} onClick={doSave} />
	</Modal>
}

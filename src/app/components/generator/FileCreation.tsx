import { DataModel } from '@mcschema/core'
import { useState } from 'preact/hooks'
import { Analytics } from '../../Analytics'
import { useLocale, useProject } from '../../contexts'
import { useModal } from '../../hooks'
import { Btn } from '../Btn'
import { TextInput } from '../forms'

interface Props {
	model: DataModel,
	id: string,
	onClose: () => void,
}
export function FileCreation({ model, id, onClose }: Props) {
	const { locale } = useLocale()
	const { projects, project, updateFile } = useProject()
	const [fileId, setFileId] = useState('')

	const doSave = () => {
		Analytics.saveProjectFile(id, projects.length, project.files.length, 'hotkey')
		updateFile(id, undefined, { type: id, id: fileId, data: DataModel.unwrapLists(model.data) })
		onClose()
	}

	useModal(onClose)

	return <div class="modal file-creation" onClick={e => e.stopPropagation()}>
		<p>{locale('project.save_current_file')}</p>
		<TextInput autofocus class="btn btn-input" value={fileId} onChange={setFileId} onEnter={doSave} onCancel={onClose} placeholder={locale('resource_location')} spellcheck={false} />
		<Btn icon="file" label={locale('project.save')} onClick={doSave} />
	</div>
}

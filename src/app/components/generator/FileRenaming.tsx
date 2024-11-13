import { useState } from 'preact/hooks'
import { Analytics } from '../../Analytics.js'
import { useLocale } from '../../contexts/index.js'
import { Btn } from '../Btn.js'
import { TextInput } from '../forms/index.js'
import { Modal } from '../Modal.js'

interface Props {
	uri: string,
	onClose: () => void,
}
export function FileRenaming({ uri, onClose }: Props) {
	const { locale } = useLocale()
	const [fileId, setFileId] = useState(uri) // TODO: get original file id
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
		Analytics.renameProjectFile('menu')
		// TODO: rename file
		onClose()
	}

	return <Modal class="file-modal" onDismiss={onClose}>
		<p>{locale('project.rename_file')}</p>
		<TextInput autofocus class="btn btn-input" value={fileId} onChange={changeFileId} onEnter={doSave} onCancel={onClose} placeholder={locale('resource_location')} spellcheck={false} />
		{error !== undefined && <span class="invalid">{error}</span>}
		<Btn icon="pencil" label={locale('project.rename')} onClick={doSave} />
	</Modal>
}

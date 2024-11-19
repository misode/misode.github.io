import { useCallback, useState } from 'preact/hooks'
import { Analytics } from '../../Analytics.js'
import { useLocale } from '../../contexts/index.js'
import { useModal } from '../../contexts/Modal.jsx'
import { Btn } from '../Btn.js'
import { TextInput } from '../forms/index.js'
import { Modal } from '../Modal.js'

interface Props {
	oldId: string,
	onRename: (newId: string) => void,
}
export function FileRenaming({ oldId, onRename }: Props) {
	const { locale } = useLocale()
	const { hideModal } = useModal()
	const [fileId, setFileId] = useState(oldId)
	const [error, setError] = useState<string>()

	const changeFileId = useCallback((str: string) => {
		setError(undefined)
		setFileId(str)
	}, [])

	const doRename = useCallback(() => {
		if (!fileId.match(/^([a-z0-9_.-]+:)?[a-z0-9/_.-]+$/)) {
			setError('Invalid resource location')
			return
		}
		Analytics.renameProjectFile('menu')
		onRename(fileId)
		hideModal()
	}, [fileId, hideModal])

	return <Modal class="file-modal">
		<p>{locale('project.rename_file')}</p>
		<TextInput autofocus class="btn btn-input" value={fileId} onChange={changeFileId} onEnter={doRename} onCancel={hideModal} placeholder={locale('resource_location')} spellcheck={false} />
		{error !== undefined && <span class="invalid">{error}</span>}
		<Btn icon="pencil" label={locale('project.rename')} onClick={doRename} />
	</Modal>
}

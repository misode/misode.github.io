import { useCallback } from 'preact/hooks'
import { Analytics } from '../../Analytics.js'
import { useLocale, useProject } from '../../contexts/index.js'
import { useModal } from '../../contexts/Modal.jsx'
import { Btn } from '../Btn.js'
import { Modal } from '../Modal.js'

export function ProjectDeletion() {
	const { locale } = useLocale()
	const { hideModal } = useModal()
	const { project, deleteProject } = useProject()

	const doSave = useCallback(() => {
		Analytics.deleteProject('menu')
		deleteProject(project.name)
		hideModal()
	}, [deleteProject, hideModal])

	return <Modal class="file-modal">
		<p>{locale('project.delete_confirm.1', project.name)}</p>
		<p><b>{locale('project.delete_confirm.2')}</b></p>
		<div class="button-group">
			<Btn icon="trashcan" label={locale('project.delete')} onClick={doSave} class="danger" />
			<Btn label={locale('project.cancel')} onClick={hideModal} />
		</div>
	</Modal>
}

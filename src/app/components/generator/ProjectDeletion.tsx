import { Analytics } from '../../Analytics.js'
import { useLocale, useProject } from '../../contexts/index.js'
import { Btn } from '../Btn.js'
import { Modal } from '../Modal.js'

interface Props {
	onClose: () => void,
}
export function ProjectDeletion({ onClose }: Props) {
	const { locale } = useLocale()
	const { projects, project, deleteProject } = useProject()

	const doSave = () => {
		Analytics.deleteProject(projects.length, project.files.length, 'menu')
		deleteProject(project.name)
		onClose()
	}

	return <Modal class="file-modal" onDismiss={onClose}>
		<p>{locale('project.delete_confirm.1', project.name)}</p>
		<p><b>{locale('project.delete_confirm.2')}</b></p>
		<div class="button-group">
			<Btn icon="trashcan" label={locale('project.delete')} onClick={doSave} class="danger" />
			<Btn label={locale('project.cancel')} onClick={onClose} />
		</div>
	</Modal>
}

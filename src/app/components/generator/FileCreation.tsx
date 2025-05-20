import type { DocAndNode } from '@spyglassmc/core'
import { Identifier } from 'deepslate'
import { useCallback, useState } from 'preact/hooks'
import type { Method } from '../../Analytics.js'
import { Analytics } from '../../Analytics.js'
import type { ConfigGenerator } from '../../Config.js'
import { getProjectRoot, useLocale, useProject, useVersion } from '../../contexts/index.js'
import { useModal } from '../../contexts/Modal.jsx'
import { useSpyglass } from '../../contexts/Spyglass.jsx'
import { genPath, message } from '../../Utils.js'
import { Btn } from '../Btn.js'
import { TextInput } from '../forms/index.js'
import { Modal } from '../Modal.js'

interface Props {
	docAndNode: DocAndNode,
	gen: ConfigGenerator,
	method: Method,
}
export function FileCreation({ docAndNode, gen, method }: Props) {
	const { locale } = useLocale()
	const { version } = useVersion()
	const { hideModal } = useModal()
	const { project } = useProject()
	const { client } = useSpyglass()

	const [fileId, setFileId] = useState(gen.id === 'pack_mcmeta' ? 'pack' : '')
	const [error, setError] = useState<string>()
	
	const changeFileId = (str: string) => {
		setError(undefined)
		setFileId(str)
	}

	const doSave = useCallback(() => {
		if (!project) {
			return
		}
		if (!fileId.match(/^([a-z0-9_.-]+:)?[a-z0-9/_.-]+$/)) {
			setError('Invalid resource location')
			return
		}
		const id = Identifier.parse(fileId.includes(':') || project.namespace === undefined ? fileId : `${project.namespace}:${fileId}`)
		const pack = gen.tags?.includes('assets') ? 'assets' : 'data'
		const projectRoot = getProjectRoot(project)
		const uri = gen.id === 'pack_mcmeta'
			? `${projectRoot}pack.mcmeta`
			: `${projectRoot}${pack}/${id.namespace}/${genPath(gen, version)}/${id.path}${gen.ext ?? '.json'}`
		Analytics.saveProjectFile(method)
		const text = docAndNode.doc.getText()
		client.fs.writeFile(uri, text).then(() => {
			hideModal()
		}).catch((e) => {
			setError(message(e))
		})
	}, [version, project, client, fileId ])

	return <Modal class="file-modal">
		<p>{locale('project.save_current_file')}</p>
		<TextInput autofocus={gen.id !== 'pack_mcmeta'} class="btn btn-input" value={fileId} onChange={changeFileId} onEnter={doSave} onCancel={hideModal} placeholder={locale('resource_location')} spellcheck={false} readOnly={gen.id === 'pack_mcmeta'} />
		{error !== undefined && <span class="invalid">{error}</span>}
		<Btn icon="file" label={locale('project.save')} onClick={doSave} />
	</Modal>
}

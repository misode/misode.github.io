import type { DataModel } from '@mcschema/core'
import { ModelPath } from '@mcschema/core'
import { useEffect, useRef } from 'preact/hooks'
import { useModel } from '../hooks'
import { locale } from '../Locales'
import { transformOutput } from '../schema/transformOutput'
import type { BlockStateRegistry } from '../Schemas'

type SourcePanelProps = {
	lang: string,
	name: string,
	model: DataModel | null,
	blockStates: BlockStateRegistry | null,
	doCopy?: number,
	doDownload?: number,
	doImport?: number,
	onError: (message: string) => unknown,
}
export function SourcePanel({ lang, name, model, blockStates, doCopy, doDownload, doImport, onError }: SourcePanelProps) {
	const loc = locale.bind(null, lang)
	const source = useRef<HTMLTextAreaElement>(null)
	const download = useRef<HTMLAnchorElement>(null)

	useModel(model, model => {
		try {
			const props = { blockStates: blockStates ?? {} }
			const data = model.schema.hook(transformOutput, new ModelPath(model), model.data, props)
			source.current.value = JSON.stringify(data, null, 2) + '\n'
		} catch (e) {
			onError(`Error getting JSON output: ${e.message}`)
			console.error(e)
			source.current.value = ''
		}
	})

	const onImport = () => {
		try {
			const data = JSON.parse(source.current.value)
			model?.reset(data, false)
		} catch (e) {
			// TODO
		}
	}

	useEffect(() => {
		if (doCopy && source.current) {
			source.current.select()
			document.execCommand('copy')
		}
	}, [doCopy])

	useEffect(() => {
		if (doDownload && source.current && download.current) {
			const content = encodeURIComponent(source.current.value)
			download.current.setAttribute('href', `data:text/json;charset=utf-8,${content}`)
			download.current.setAttribute('download', `${name}.json`)
			download.current.click()
		}
	}, [doDownload])

	useEffect(() => {
		if (doImport && source.current) {
			source.current.value = ''
			source.current.select()
		}
	}, [doImport])

	return <> 
		<textarea ref={source} class="source" onChange={onImport} spellcheck={false} autocorrect="off" placeholder={loc('source_placeholder')}></textarea>
		<a ref={download} style="display: none;"></a>
	</>
}

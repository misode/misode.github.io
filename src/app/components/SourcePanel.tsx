import type { DataModel } from '@mcschema/core'
import { ModelPath } from '@mcschema/core'
import { useEffect, useRef, useState } from 'preact/hooks'
import { Btn, BtnMenu } from '.'
import { useModel } from '../hooks'
import { locale } from '../Locales'
import { transformOutput } from '../schema/transformOutput'
import type { BlockStateRegistry } from '../Schemas'
import { Store } from '../Store'

const INDENT: Record<string, number | string> = {
	'2_spaces': 2,
	'4_spaces': 4,
	tabs: '\t',
}

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
	const [indent, setIndent] = useState(Store.getIndent())
	const source = useRef<HTMLTextAreaElement>(null)
	const download = useRef<HTMLAnchorElement>(null)
	const retransform = useRef<Function>()

	useEffect(() => {
		retransform.current = () => {
			if (!model || !blockStates) return
			try {
				const props = { blockStates: blockStates ?? {} }
				const data = model.schema.hook(transformOutput, new ModelPath(model), model.data, props)
				source.current.value = JSON.stringify(data, null, INDENT[indent]) + '\n'
			} catch (e) {
				onError(`Error getting JSON output: ${e.message}`)
				console.error(e)
				source.current.value = ''
			}
		}
	})

	useModel(model, () => {
		retransform.current()
	})

	useEffect(() => {
		retransform.current()
	}, [indent])

	const onImport = () => {
		try {
			const data = JSON.parse(source.current.value)
			model?.reset(data, false)
		} catch (e) {
			onError(`Error importing: ${e.message}`)
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

	const changeIndent = (value: string) => {
		Store.setIndent(value)
		setIndent(value)
	}

	return <> 
		<div class="controls">
			<BtnMenu icon="gear">
				{Object.entries(INDENT).map(([key]) =>
					<Btn label={loc(`indentation.${key}`)} active={indent === key}
						onClick={() => changeIndent(key)}/>
				)}
			</BtnMenu>
		</div>
		<textarea ref={source} class="source" onChange={onImport} spellcheck={false} autocorrect="off" placeholder={loc('source_placeholder')}></textarea>
		<a ref={download} style="display: none;"></a>
	</>
}

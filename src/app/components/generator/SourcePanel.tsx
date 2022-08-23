import { DataModel } from '@mcschema/core'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { useLocale } from '../../contexts/index.js'
import { useModel } from '../../hooks/index.js'
import { getOutput } from '../../schema/transformOutput.js'
import type { BlockStateRegistry } from '../../services/index.js'
import { getSourceFormats, getSourceIndent, getSourceIndents, parseSource, stringifySource } from '../../services/index.js'
import { Store } from '../../Store.js'
import { message } from '../../Utils.js'
import { Btn, BtnMenu } from '../index.js'

interface Editor {
	getValue(): string
	setValue(value: string): void
	configure(indent: string, format: string): void
	select(): void
}

type SourcePanelProps = {
	name: string,
	model: DataModel | undefined,
	blockStates: BlockStateRegistry | undefined,
	doCopy?: number,
	doDownload?: number,
	doImport?: number,
	copySuccess: () => unknown,
	onError: (message: string | Error) => unknown,
}
export function SourcePanel({ name, model, blockStates, doCopy, doDownload, doImport, copySuccess, onError }: SourcePanelProps) {
	const { locale } = useLocale()
	const [indent, setIndent] = useState(Store.getIndent())
	const [format, setFormat] = useState(Store.getFormat())
	const [highlighting, setHighlighting] = useState(Store.getHighlighting())
	const [braceLoaded, setBraceLoaded] = useState(false)
	const download = useRef<HTMLAnchorElement>(null)
	const retransform = useRef<Function>(() => {})
	const onImport = useRef<() => Promise<void>>(async () => {})

	const textarea = useRef<HTMLTextAreaElement>(null)
	const editor = useRef<Editor>()

	const getSerializedOutput = useCallback((model: DataModel, blockStates: BlockStateRegistry) => {
		const data = getOutput(model, blockStates)
		return stringifySource(data, format, indent)
	}, [indent, format])

	useEffect(() => {
		retransform.current = () => {
			if (!editor.current) return
			if (!model || !blockStates) return
			try {
				const output = getSerializedOutput(model, blockStates)
				editor.current.setValue(output)
			} catch (e) {
				if (e instanceof Error) {
					e.message = `Error getting JSON output: ${e.message}`
					onError(e)
				} else {
					onError(`Error getting JSON output: ${message(e)}`)
				}
				console.error(e)
				editor.current.setValue('')
			}
		}

		onImport.current = async () => {
			if (!editor.current) return
			const value = editor.current.getValue()
			if (value.length === 0) return
			try {
				const data = await parseSource(value, format)
				model?.reset(DataModel.wrapLists(data), false)
			} catch (e) {
				if (e instanceof Error) {
					e.message = `Error importing: ${e.message}`
					onError(e)
				} else {
					onError(`Error importing: ${message(e)}`)
				}
				console.error(e)
			}
		}
	}, [model, blockStates, indent, format, highlighting])

	useEffect(() => {
		if (highlighting) {
			setBraceLoaded(false)
			editor.current = {
				getValue() { return ''},
				setValue() {},
				configure() {},
				select() {},
			}
			import('brace').then(async (brace) => {
				await Promise.all([
					import('brace/mode/json'),
					import('brace/mode/yaml'),
				])
				const braceEditor = brace.edit('editor')
				braceEditor.setOptions({
					fontSize: 14,
					showFoldWidgets: false,
					highlightSelectedWord: false,
				})
				braceEditor.$blockScrolling = Infinity
				braceEditor.on('blur', () => onImport.current())
				braceEditor.getSession().setMode('ace/mode/json')

				editor.current = {
					getValue() {
						return braceEditor.getSession().getValue()
					},
					setValue(value) {
						braceEditor.getSession().setValue(value)
					},
					configure(indent, format) {
						braceEditor.setOption('useSoftTabs', indent !== 'tabs')
						braceEditor.setOption('tabSize', indent === 'tabs' ? 4 : getSourceIndent(indent))
						braceEditor.getSession().setMode(`ace/mode/${format}`)
					},
					select() {
						braceEditor.selectAll()
					},
				}
				setBraceLoaded(true)
			})
		} else {
			editor.current = {
				getValue() {
					if (!textarea.current) return ''
					return textarea.current.value
				},
				setValue(value: string) {
					if (!textarea.current) return
					textarea.current.value = value
				},
				configure() {},
				select() {},
			}
		}
	}, [highlighting])

	useModel(model, () => {
		if (!retransform.current) return
		retransform.current()
	})
	useEffect(() => {
		if (!retransform.current) return
		if (model) retransform.current()
	}, [model])

	useEffect(() => {
		if (!editor.current || !retransform.current) return
		if (!highlighting || braceLoaded) {
			editor.current.configure(indent, format)
			retransform.current()
		}
	}, [indent, format, highlighting, braceLoaded])

	useEffect(() => {
		if (doCopy && model && blockStates) {
			navigator.clipboard.writeText(getSerializedOutput(model, blockStates)).then(() => {
				copySuccess()
			})
		}
	}, [doCopy])

	useEffect(() => {
		if (doDownload && model && blockStates && download.current) {
			const content = encodeURIComponent(getSerializedOutput(model, blockStates))
			download.current.setAttribute('href', `data:text/json;charset=utf-8,${content}`)
			const fileName = name === 'pack_mcmeta' ? 'pack.mcmeta' : `${name}.${format}`
			download.current.setAttribute('download', fileName)
			download.current.click()
		}
	}, [doDownload])

	useEffect(() => {
		if (doImport && editor.current) {
			editor.current.setValue('')
			editor.current.select()
		}
	}, [doImport])

	const changeIndent = (value: string) => {
		Store.setIndent(value)
		setIndent(value)
	}

	const changeFormat = (value: string) => {
		Store.setFormat(value)
		setFormat(value)
	}

	const changeHighlighting = (value: boolean) => {
		Store.setHighlighting(value)
		setHighlighting(value)
	}

	return <> 
		<div class="controls source-controls">
			<BtnMenu icon="gear" tooltip={locale('output_settings')} data-cy="source-controls">
				{getSourceIndents().map(key =>
					<Btn label={locale(`indentation.${key}`)} active={indent === key}
						onClick={() => changeIndent(key)}/>
				)}
				<hr />
				{getSourceFormats().map(key =>
					<Btn label={locale(`format.${key}`)} active={format === key}
						onClick={() => changeFormat(key)} />)}
				<hr />
				<Btn icon={highlighting ? 'square_fill' : 'square'} label={locale('highlighting')}
					onClick={() => changeHighlighting(!highlighting)} />
			</BtnMenu>
		</div>
		{highlighting
			? <pre id="editor" class="source"></pre>
			: <textarea ref={textarea} class="source" spellcheck={false} autocorrect="off" onBlur={onImport.current}></textarea>}
		<a ref={download} style="display: none;"></a>
	</>
}

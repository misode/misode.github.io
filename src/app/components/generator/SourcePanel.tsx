import type { DocAndNode } from '@spyglassmc/core'
import { fileUtil } from '@spyglassmc/core'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { useLocale } from '../../contexts/index.js'
import { useLocalStorage } from '../../hooks/index.js'
import { getSourceFormats, getSourceIndent, getSourceIndents, parseSource, sortData, stringifySource } from '../../services/index.js'
import type { Spyglass } from '../../services/Spyglass.js'
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
	spyglass: Spyglass | undefined,
	docAndNode: DocAndNode | undefined,
	doCopy?: number,
	doDownload?: number,
	doImport?: number,
	copySuccess: () => unknown,
	onError: (message: string | Error) => unknown,
}
export function SourcePanel({ spyglass, docAndNode, doCopy, doDownload, doImport, copySuccess, onError }: SourcePanelProps) {
	const { locale } = useLocale()
	const [indent, setIndent] = useState(Store.getIndent())
	const [format, setFormat] = useState(Store.getFormat())
	const [sort, setSort] = useLocalStorage('misode_output_sort', 'schema')
	const [highlighting, setHighlighting] = useState(Store.getHighlighting())
	const [braceLoaded, setBraceLoaded] = useState(false)
	const download = useRef<HTMLAnchorElement>(null)
	const retransform = useRef<Function>(() => {})
	const onImport = useRef<() => Promise<void>>(async () => {})

	const textarea = useRef<HTMLTextAreaElement>(null)
	const editor = useRef<Editor>()

	const getSerializedOutput = useCallback((text: string) => {
		let data = JSON.parse(text)
		if (sort === 'alphabetically') {
			data = sortData(data)
		}
		return stringifySource(data, format, indent)
	}, [indent, format, sort])

	const text = docAndNode?.doc.getText()
	
	useEffect(() => {
		retransform.current = () => {
			if (!editor.current || text === undefined) {
				return
			}
			try {
				const output = getSerializedOutput(text)
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
			if (!spyglass || !docAndNode) return
			try {
				const data = await parseSource(value, format)
				await spyglass.setFileContents(docAndNode.doc.uri, JSON.stringify(data))
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
	}, [spyglass, docAndNode, text, indent, format, sort, highlighting])

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
					scrollPastEnd: 0.5,
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

	// TODO: when file contents change, retransform
	useEffect(() => {
		if (retransform.current && text !== undefined) {
			retransform.current()
		}
	}, [text])

	useEffect(() => {
		if (!editor.current || !retransform.current) return
		if (!highlighting || braceLoaded) {
			editor.current.configure(indent, format === 'snbt' ? 'yaml' : format)
			retransform.current()
		}
	}, [indent, format, sort, highlighting, braceLoaded])

	useEffect(() => {
		if (doCopy && text !== undefined) {
			navigator.clipboard.writeText(getSerializedOutput(text)).then(() => {
				copySuccess()
			})
		}
	}, [doCopy, text])

	useEffect(() => {
		if (doDownload && docAndNode && text !== undefined && download.current) {
			const content = encodeURIComponent(getSerializedOutput(text))
			download.current.setAttribute('href', `data:text/json;charset=utf-8,${content}`)
			const fileName = fileUtil.basename(docAndNode.doc.uri)
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

	const importFromClipboard = useCallback(async () => {
		if (editor.current) {
			const text = await navigator.clipboard.readText()
			editor.current.setValue(text)
			onImport.current()
		}
	}, [editor, onImport])

	return <> 
		<div class="controls source-controls">
			{window.matchMedia('(pointer: coarse)').matches && <>
				<Btn icon="paste" onClick={importFromClipboard} />
			</>}
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
				<Btn icon={sort === 'alphabetically' ? 'square_fill' : 'square'} label={locale('sort_alphabetically')}
					onClick={() => setSort(sort === 'alphabetically' ? 'schema' : 'alphabetically')} />
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

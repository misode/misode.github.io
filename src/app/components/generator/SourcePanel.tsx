import type { DocAndNode } from '@spyglassmc/core'
import { fileUtil } from '@spyglassmc/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { useLocale } from '../../contexts/index.js'
import { useDocAndNode, useSpyglass } from '../../contexts/Spyglass.jsx'
import { useLocalStorage } from '../../hooks/index.js'
import { getSourceFormats, getSourceIndent, getSourceIndents, parseSource, stringifySource } from '../../services/index.js'
import { Store } from '../../Store.js'
import { message } from '../../Utils.js'
import { Btn, BtnMenu } from '../index.js'

interface Editor {
	getValue(): string
	setValue(value: string): void
	configure(indent: string, format: string, wrap: boolean): void
	select(): void
}

type SourcePanelProps = {
	docAndNode: DocAndNode | undefined,
	doCopy?: number,
	doDownload?: number,
	doImport?: number,
	copySuccess: () => unknown,
	onError: (message: string | Error) => unknown,
}
export function SourcePanel({ docAndNode, doCopy, doDownload, doImport, copySuccess, onError }: SourcePanelProps) {
	const { locale } = useLocale()
	const { service } = useSpyglass()
	const [cIndent, setIndent] = useState(Store.getIndent())
	const [cFormat, setFormat] = useState(Store.getFormat())
	const [inline, setInline] = useLocalStorage('misode_output_inline', false, (s) => s === 'true', (b) => b ? 'true' : 'false')
	// const [sort, setSort] = useLocalStorage('misode_output_sort', 'schema')
	const [highlighting, setHighlighting] = useState(Store.getHighlighting())
	const [braceLoaded, setBraceLoaded] = useState(false)
	const download = useRef<HTMLAnchorElement>(null)
	const retransform = useRef<Function>(() => {})
	const onImport = useRef<() => Promise<void>>(async () => {})
	const outputRef = useRef<string>()

	const textarea = useRef<HTMLTextAreaElement>(null)
	const editor = useRef<Editor>()

	const { indent, format } = useMemo(() => {
		return inline ? { indent: 'minified', format: 'snbt' } : { indent: cIndent, format: cFormat }
	}, [cIndent, cFormat, inline])

	const getSerializedOutput = useCallback((text: string) => {
		// TODO: implement sort
		return stringifySource(text, format, indent)
	}, [indent, format])

	const text = useDocAndNode(docAndNode)?.doc.getText()
	
	useEffect(() => {
		retransform.current = () => {
			if (!editor.current || text === undefined) {
				return
			}
			try {
				const output = getSerializedOutput(text)
				outputRef.current = output
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
			if (!service || !docAndNode) return
			try {
				const text = await parseSource(value, format)
				await service.writeFile(docAndNode.doc.uri, text)
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
	}, [service, docAndNode, text, indent, format, highlighting])

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
					indentedSoftWrap: false,
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
					configure(indent, format, wrap) {
						braceEditor.setOption('wrap', wrap)
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
				configure(_indent, _format, wrap) {
					if (!textarea.current) return
					textarea.current.style.wordBreak = wrap ? 'break-all' : 'unset'
					textarea.current.style.whiteSpace = wrap ? 'wrap' : 'pre'
				},
				select() {},
			}
		}
	}, [highlighting])

	useEffect(() => {
		if (retransform.current && text !== undefined) {
			retransform.current()
		}
	}, [text])

	useEffect(() => {
		if (!editor.current || !retransform.current) return
		if (!highlighting || braceLoaded) {
			editor.current.configure(indent, format === 'snbt' ? 'yaml' : format, inline)
			retransform.current()
		}
	}, [indent, format, inline, highlighting, braceLoaded])

	useEffect(() => {
		if (doCopy && outputRef.current) {
			navigator.clipboard.writeText(outputRef.current).then(() => {
				copySuccess()
			})
		}
	}, [doCopy, textarea])

	useEffect(() => {
		if (doDownload && docAndNode && outputRef.current && download.current) {
			const content = encodeURIComponent(outputRef.current)
			download.current.setAttribute('href', `data:text/json;charset=utf-8,${content}`)
			const fileName = fileUtil.basename(docAndNode.doc.uri)
			download.current.setAttribute('download', fileName)
			download.current.click()
		}
	}, [doDownload, outputRef])

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
			<Btn label={locale('inline')} active={inline} onClick={() => setInline(!inline)} />
			<BtnMenu icon="gear" tooltip={locale('output_settings')}>
				{getSourceIndents().map(key =>
					<Btn label={locale(`indentation.${key}`)} active={cIndent === key}
						onClick={() => changeIndent(key)}/>
				)}
				<hr />
				{getSourceFormats().map(key =>
					<Btn label={locale(`format.${key}`)} active={cFormat === key}
						onClick={() => changeFormat(key)} />)}
				<hr />
				{/* <Btn icon={sort === 'alphabetically' ? 'square_fill' : 'square'} label={locale('sort_alphabetically')}
					onClick={() => setSort(sort === 'alphabetically' ? 'schema' : 'alphabetically')} /> */}
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

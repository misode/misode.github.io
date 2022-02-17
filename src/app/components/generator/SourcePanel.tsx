import { DataModel } from '@mcschema/core'
import brace from 'brace'
import 'brace/mode/json'
import 'brace/mode/yaml'
import json from 'comment-json'
import yaml from 'js-yaml'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { Btn, BtnMenu } from '..'
import { useLocale } from '../../contexts'
import { useModel } from '../../hooks'
import { getOutput } from '../../schema/transformOutput'
import type { BlockStateRegistry } from '../../services'
import { Store } from '../../Store'
import { message } from '../../Utils'

const INDENT: Record<string, number | string | undefined> = {
	'2_spaces': 2,
	'4_spaces': 4,
	tabs: '\t',
	minified: undefined,
}

const FORMATS: Record<string, {
	parse: (v: string) => any,
	stringify: (v: any, indentation: string | number | undefined) => string,
}> = {
	json: {
		parse: json.parse,
		stringify: (v, i) => json.stringify(v, null, i) + '\n',
	},
	yaml: {
		parse: yaml.load,
		stringify: (v, i) => yaml.dump(v, {
			flowLevel: i === undefined ? 0 : -1,
			indent: typeof i === 'string' ? 4 : i,
		}),
	},
}

type SourcePanelProps = {
	name: string,
	model: DataModel | null,
	blockStates: BlockStateRegistry | null,
	doCopy?: number,
	doDownload?: number,
	doImport?: number,
	copySuccess: () => unknown,
	onError: (message: string) => unknown,
}
export function SourcePanel({ name, model, blockStates, doCopy, doDownload, doImport, copySuccess, onError }: SourcePanelProps) {
	const { locale } = useLocale()
	const [indent, setIndent] = useState(Store.getIndent())
	const [format, setFormat] = useState(Store.getFormat())
	const download = useRef<HTMLAnchorElement>(null)
	const retransform = useRef<Function>()
	const onImport = useRef<(e: any) => any>()

	const editor = useRef<brace.Editor>()

	const getSerializedOutput = useCallback((model: DataModel, blockStates: BlockStateRegistry) => {
		const data = getOutput(model, blockStates)
		return FORMATS[format].stringify(data, INDENT[indent])
	}, [indent, format])

	useEffect(() => {
		retransform.current = () => {
			if (!model || !blockStates) return
			try {
				const output = getSerializedOutput(model, blockStates)
				editor.current.getSession().setValue(output)
			} catch (e) {
				onError(`Error getting JSON output: ${message(e)}`)
				console.error(e)
				editor.current.setValue('')
			}
		}

		onImport.current = () => {
			const value = editor.current.getValue()
			if (value.length === 0) return
			try {
				const data = FORMATS[format].parse(value)
				model?.reset(DataModel.wrapLists(data), false)
			} catch (e) {
				onError(`Error importing: ${message(e)}`)
				console.error(e)
			}
		}
	}, [model, blockStates, indent, format])

	useEffect(() => {
		editor.current = brace.edit('editor')
		editor.current.setOptions({
			fontSize: 14,
			showFoldWidgets: false,
			highlightSelectedWord: false,
		})
		editor.current.$blockScrolling = Infinity
		editor.current.on('blur', e => onImport.current(e))
		editor.current.getSession().setMode('ace/mode/json')
	}, [])

	useModel(model, () => {
		retransform.current()
	})
	useEffect(() => {
		if (model) retransform.current()
	}, [model])

	useEffect(() => {
		editor.current.setOption('useSoftTabs', indent !== 'tabs')
		editor.current.setOption('tabSize', indent === 'tabs' ? 4 : INDENT[indent])
		editor.current.getSession().setMode(`ace/mode/${format}`)
		retransform.current()
	}, [indent, format])

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
			download.current.setAttribute('download', `${name}.${format}`)
			download.current.click()
		}
	}, [doDownload])

	useEffect(() => {
		if (doImport && editor.current) {
			editor.current.setValue('')
			editor.current.selectAll()
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

	return <> 
		<div class="controls source-controls">
			<BtnMenu icon="gear" tooltip={locale('output_settings')} data-cy="source-controls">
				{Object.entries(INDENT).map(([key]) =>
					<Btn label={locale(`indentation.${key}`)} active={indent === key}
						onClick={() => changeIndent(key)}/>
				)}
				<hr />
				{Object.keys(FORMATS).map(key =>
					<Btn label={locale(`format.${key}`)} active={format === key}
						onClick={() => changeFormat(key)} />)}
			</BtnMenu>
		</div>
		<pre id="editor" class="source"></pre>
		<a ref={download} style="display: none;"></a>
	</>
}

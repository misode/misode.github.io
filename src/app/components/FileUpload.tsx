import { useCallback, useRef } from 'preact/hooks'
import { useLocale } from '../contexts/index.js'
import { Btn } from './index.js'

interface Props {
	value: File | undefined,
	onChange: (file: File) => unknown,
	label?: string,
	accept?: string,
}
export function FileUpload({ value, onChange, label, accept }: Props) {
	const { locale } = useLocale()
	const fileUpload = useRef<HTMLInputElement>(null)
	
	const onUpload = () => {
		if (fileUpload.current === null) return
		for (let i = 0; i < (fileUpload.current.files?.length ?? 0); i++) {
			const file = fileUpload.current.files![i]
			onChange(file)
		} 
	}

	const onDrop = useCallback((e: DragEvent) => {
		e.preventDefault()
		if(!e.dataTransfer) return

		for (let i = 0; i < e.dataTransfer.files.length; i++) {
			const file = e.dataTransfer.files[i]
			onChange(file)
		}
	}, [onChange])

	return <label class="file-upload" onDrop={onDrop} onDragOver={e => e.preventDefault()}>
		<input ref={fileUpload} type="file" onChange={onUpload} accept={accept} />
		<Btn label={label ?? locale('choose_file')} />
		<span>
			{value ? value.name : locale('no_file_chosen')}
		</span>
	</label>
}

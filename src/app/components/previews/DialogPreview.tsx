import { Identifier, ItemStack } from 'deepslate'
import type { ComponentChild, ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { clamp, safeJsonParse } from '../../Utils.js'
import { ItemDisplay } from '../ItemDisplay.jsx'
import { TextComponent } from '../TextComponent.jsx'
import type { PreviewProps } from './index.js'

export const DialogPreview = ({ docAndNode }: PreviewProps) => {
	const overlay = useRef<HTMLDivElement>(null)

	const text = docAndNode.doc.getText()
	const dialog = safeJsonParse(text) ?? {}
	const type = dialog.type?.replace(/^minecraft:/, '')
	const footerHeight = type === 'multi_action_input_form' ? 5 : 33

	useEffect(() => {
		function resizeHandler() {
			if (!overlay.current) return
			const width = Math.floor(overlay.current.clientWidth)
			overlay.current.style.setProperty('--dialog-px', `${width/400}px`)
		}
		resizeHandler()
		window.addEventListener('resize', resizeHandler)
		return () => window.removeEventListener('resize', resizeHandler)
	}, [overlay])

	return <>
		<div ref={overlay} class="preview-overlay dialog-preview" style="--dialog-px: 1px;">
			<img src="/images/dialog/background.webp" alt="" draggable={false} />
			<div style={'top: 0; left: 0; width: 100%; height: 100%;'}>
				<DialogTitle title={dialog.title} />
				<div style={`display: flex; flex-direction: column; gap: ${px(10)}; align-items: center; padding-right: ${px(10)} /* MC-297972 */; overflow-y: auto; height: calc(100% - ${px(33 + footerHeight)})`}>
					<DialogBody body={dialog.body} />
					<DialogContent dialog={dialog} />
				</div>
				<div style={`bottom: 0; left: 0; width: 100%; height: ${px(footerHeight)}; display: flex; justify-content: center; align-items: center;`}>
					<DialogFooter dialog={dialog} />
				</div>
			</div>
		</div>
	</>
}

function DialogTitle({ title }: { title: any }) {
	// TODO: add warning button tooltip
	return <div style={`height: ${px(33)}; display: flex; gap: ${px(10)}; justify-content: center; align-items: center`}>
		<TextComponent component={title} />
		<WithTooltip tooltip="This is a custom screen. Click here to learn more.">
			<div class="dialog-warning-button" style={`width: ${px(20)}; height: ${px(20)};`}></div>
		</WithTooltip>
	</div>
}

function DialogBody({ body }: { body: any }) {
	if (!body) {
		body = []
	} else if (!Array.isArray(body)) {
		body = [body]
	}
	return <>
		{body?.map((b: any) => {
			const type = b.type?.replace(/^minecraft:/, '')
			if (type === 'plain_message') {
				return <div class="dialog-body" style={`max-width: ${px(clamp(b.width ?? 200, 1, 1024))}; padding: ${px(4)}`}>
					<TextComponent component={b.contents} />
				</div>
			}
			if (type == 'item') {
				// TODO: add item components
				const item = new ItemStack(Identifier.parse(b.item?.id ?? 'air'), b.show_decorations ? (b.item?.count ?? 1) : 1)
				return <div style={`display: flex; gap: ${px(2)}; align-items: center; gap: ${px(4)}`}>
					<div style={`width: ${px(clamp(b.width ?? 16, 1, 256))}; height: ${px(clamp(b.height ?? 16, 1, 256))}`}>
						<div style={`width: ${px(16)}; height: ${px(16)}`}>
							<ItemDisplay item={item} tooltip={b.show_tooltip ?? true} />
						</div>
					</div>
					{b.description && <div style={`max-width: ${px(clamp(b.description.width ?? 200, 1, 1024))};`}>
						<TextComponent component={b.description.contents} />
					</div>}
				</div>
			}
			return <></>
		})}
	</>
}

function DialogContent({ dialog }: { dialog: any }) {
	const type = dialog.type?.replace(/^minecraft:/, '')

	if (type === 'dialog_list') {
		let dialogs = []
		if (Array.isArray(dialog.dialogs)) {
			dialogs = dialog.dialogs
		} else if (typeof dialog.dialogs === 'string') {
			if (dialog.dialogs.startsWith('#')) {
				dialogs = ['dialog_1', 'dialog_2', 'dialog_3']
			} else {
				dialogs = [dialog.dialogs]
			}
		}
		return <ColumnsGrid columns={dialog.columns ?? 2}>
			{dialogs.map((d: any) => {
				let text = Identifier.parse(d).path.replaceAll('/', ' ').replaceAll('_', ' ')
				text = text.charAt(0).toUpperCase() + text.substring(1)
				return <Button label={text} width={dialog.button_width ?? 150} />
			})}
		</ColumnsGrid>
	}

	if (type === 'multi_action') {
		return <ColumnsGrid columns={dialog.columns ?? 2}>
			{dialog.actions?.map((a: any) =>
				<Button label={a.label} width={a.width ?? 150} tooltip={a.tooltip} />
			) ?? []}
		</ColumnsGrid>
	}

	if (type === 'multi_action_input_form') {
		return <>
			{dialog.inputs?.map((i: any) => <InputControl input={i} />)}
			<ColumnsGrid columns={dialog.columns ?? 2}>
				{dialog.actions?.map((a: any) =>
					<Button label={a.label} width={a.width ?? 150} tooltip={a.tooltip} />
				) ?? []}
			</ColumnsGrid>
		</>
	}

	if (type === 'server_links') {
		const links = ['Server link 1', 'Server link 2', 'Server link 3']
		return <ColumnsGrid columns={dialog.columns ?? 2}>
			{links.map((text: string) => {
				return <Button label={text} width={dialog.button_width ?? 150} />
			})}
		</ColumnsGrid>
	}

	if (type === 'simple_input_form') {
		return <>
			{dialog.inputs?.map((i: any) => <InputControl input={i} />)}
		</>
	}

	return <></>
}

function DialogFooter({ dialog }: { dialog: any }) {
	const type = dialog.type?.replace(/^minecraft:/, '')

	if (type === 'confirmation') {
		return <div style={`display: flex; gap: ${px(8)}; justify-content: center;`}>
			<Button label={dialog.yes?.label} width={dialog.yes?.width ?? 150} tooltip={dialog.yes?.tooltip} />
			<Button label={dialog.no?.label} width={dialog.no?.width ?? 150} tooltip={dialog.no?.tooltip} />
		</div>
	}

	if (type === 'dialog_list') {
		return <Button label={{translate: dialog.on_cancel ? 'gui.cancel' : 'gui.back'}} width={200} />
	}

	if (type === 'multi_action') {
		return <Button label={{translate: dialog.on_cancel ? 'gui.cancel' : 'gui.back'}} width={200} />
	}

	if (type === 'notice') {
		return <div style={`display: flex; gap: ${px(8)}; justify-content: center;`}>
			<Button label={dialog.action?.label ?? {translate: 'gui.ok'}} width={dialog.action?.width ?? 150} tooltip={dialog.action?.tooltip} />
		</div>
	}

	if (type === 'server_links') {
		return <Button label={{translate: dialog.on_cancel ? 'gui.cancel' : 'gui.back'}} width={200} />
	}

	if (type === 'simple_input_form') {
		return <div style={`display: flex; gap: ${px(8)}; justify-content: center;`}>
			<Button label={dialog.action?.label} width={dialog.action?.width ?? 150} tooltip={dialog.action?.tooltip} />
		</div>
	}

	return <></>
}

function InputControl({ input }: { input: any }) {
	const type = input.type?.replace(/^minecraft:/, '')
	// TODO: make interactive

	if (type === 'boolean') {
		return <div style={`display: flex; gap: ${px(4)}; align-items: center;`}>
			<div class={`dialog-checkbox ${input.initial ? 'dialog-selected' : ''}`} style={`width: ${px(17)}; height: ${px(17)}`}></div>
			<TextComponent component={input.label} base={{color: '#e0e0e0'}} />
		</div>
	}

	if (type === 'number_range') {
		const initial = input.initial ?? (((input.start ?? 0) + (input.end ?? 0)) / 2)
		const label = {translate: input.label_format ?? 'options.generic_value', with: [input.label ?? '', initial]}
		return <div class="dialog-slider" style={`width: ${px(clamp(input.width ?? 200, 1, 1024))}; height: ${px(20)};`}>
			<div class="dialog-slider-track"></div>
			<div class="dialog-slider-handle"></div>
			<div class="dialog-slider-text">
				<TextComponent component={label} />
			</div>
		</div>
	}

	if (type === 'single_option') {
		const initial = input.options?.find((o: any) => o.initial) ?? input.options?.[0]
		const initialLabel = typeof initial === 'string' ? initial : initial?.display ?? initial?.id ?? ''
		const label = input.label_visible === false ? initialLabel : {translate: 'options.generic_value', with: [input.label ?? '', initialLabel]}
		return <Button label={label} width={clamp(input.width ?? 200, 1, 1024)} />
	}

	if (type === 'text') {
		const height = input.multiline
			?	(input.multiline.height
				? clamp(input.multiline.height, 1, 512)
				: (9 * Math.max(input.multiline.max_lines ?? 4, 1) + 8))
			: 20
		return <div style={`display: flex; flex-direction: column; gap: ${px(4)};`}>
			{input.label_visible !== false && <TextComponent component={input.label} />}
			<div class="dialog-edit-box" style={`width: ${px(clamp(input.width ?? 200, 1, 1024))}; height: ${px(height)};`}>
				{input.initial && <TextComponent component={input.initial} />}
			</div>
		</div>
	}

	return <></>
}

interface ColumnsGridProps {
	columns: number
	children: ComponentChild[]
}
function ColumnsGrid({ columns, children }: ColumnsGridProps) {
	const totalCount = children.length
	const gridCount = Math.floor(totalCount / columns) * columns
	return <div style={`padding-top: ${px(4)}; display: grid; grid-template-columns: repeat(${columns}, minmax(0, 1fr)); gap: ${px(2)}; justify-content: center;`}>
		{children.slice(0, gridCount)}
		{totalCount > gridCount && <div style={`grid-column: span ${columns}; display: flex; gap: ${px(2)}; justify-content: center;`}>
			{children.slice(gridCount)}
		</div>}
	</div>
}

interface ButtonProps {
	label: any
	width: number
	tooltip?: any
}
function Button({ label, width, tooltip }: ButtonProps) {
	return <WithTooltip tooltip={tooltip}>
		<div class="dialog-button" style={`width: ${px(clamp(width, 1, 1024))}; height: ${px(20)};`}>
			<TextComponent component={label} oneline />
		</div>
	</WithTooltip>
}

interface WithTooltipProps {
	tooltip?: any
	children: ComponentChildren
}
function WithTooltip({ tooltip, children }: WithTooltipProps) {
	if (!tooltip) {
		return <>{children}</>
	}

	const el = useRef<HTMLDivElement>(null)
	const [tooltipOffset, setTooltipOffset] = useState<[number, number]>([0, 0])

	useEffect(() => {
		const onMove = (e: MouseEvent) => {
			requestAnimationFrame(() => {
				setTooltipOffset([e.offsetX + 20, e.offsetY - 10])
			})
		}
		el.current?.addEventListener('mousemove', onMove)
		return () => el.current?.removeEventListener('mousemove', onMove)
	}, [])

	return <div ref={el} class="tooltip-container">
		{children}
		{<div class="dialog-tooltip" style={`left: ${tooltipOffset[0]}px; top: ${tooltipOffset[1]}px;`}>
			<TextComponent component={tooltip} />
		</div>}
	</div>
}

function px(n: number) {
	return `calc(var(--dialog-px) * ${n})`
}

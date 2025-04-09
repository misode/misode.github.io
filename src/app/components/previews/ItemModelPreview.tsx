import { ItemRenderer, ItemStack, NbtString } from 'deepslate'
import { Identifier, ItemModel } from 'deepslate/render'
import { useVersion } from '../../contexts/index.js'
import { useAsync } from '../../hooks/useAsync.js'
import { AsyncCancel } from '../../hooks/useAsyncFn.js'
import { getResources, ResourceWrapper } from '../../services/Resources.js'
import { isObject, safeJsonParse } from '../../Utils.js'
import { ErrorPanel } from '../ErrorPanel.jsx'
import type { PreviewProps } from './index.js'

const PREVIEW_ID = Identifier.parse('misode:preview')
const RENDER_SIZE = 512

export const ItemModelPreview = ({ docAndNode, shown }: PreviewProps) => {
	const { version } = useVersion()

	const text = docAndNode.doc.getText()

	const { value: render, error } = useAsync(async () => {
		if (!shown) return AsyncCancel
		const resources = await getResources(version, new Map())
		const data = safeJsonParse(text) ?? {}
		if (!isObject(data) || !isObject(data.model)) {
			return undefined
		}
		const itemModel = ItemModel.fromJson(data.model)
		const wrapper = new ResourceWrapper(resources, {
			getItemModel(id) {
				if (id.equals(PREVIEW_ID)) return itemModel
				return null
			},
		})
		const canvas = document.createElement('canvas')
		canvas.width = RENDER_SIZE
		canvas.height = RENDER_SIZE
		const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true })
		if (!gl) {
			throw new Error('Cannot get WebGL2 context')
		}
		const item = new ItemStack(PREVIEW_ID, 1, new Map(Object.entries({
			'minecraft:item_model': new NbtString(PREVIEW_ID.toString()),
		})))
		const renderer = new ItemRenderer(gl, item, wrapper, { display_context: 'gui' })
		renderer.drawItem()
		const url = canvas.toDataURL()
		console.log('DRAW', url)
		return url
	}, [shown, version, text])

	if (error) {
		return <ErrorPanel error={error} prefix="Failed to initialize preview: " />
	}

	return <>
		<div class="preview-overlay">
			<img src="/images/single_item.png" alt="Container background" class="pixelated" draggable={false} />
			{render && <div class="flex items-center justify-center" style={slotStyle()}>
				<img src={render} class="w-[88.888%]" />
			</div>}
		</div>
	</>
}

const GUI_WIDTH = 176
const GUI_HEIGHT = 81
const SLOT_SIZE = 72

function slotStyle() {
	const x = 52
	const y = 4
	return {
		left: `${x*100/GUI_WIDTH}%`,
		top: `${y*100/GUI_HEIGHT}%`,
		width: `${SLOT_SIZE*100/GUI_WIDTH}%`,
		height: `${SLOT_SIZE*100/GUI_HEIGHT}%`,
	}
}

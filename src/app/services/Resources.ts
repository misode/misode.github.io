import type { BlockModelProvider, ItemStack, TextureAtlasProvider, UV } from 'deepslate/render'
import { BlockModel, Identifier, ItemRenderer, TextureAtlas, upperPowerOfTwo } from 'deepslate/render'
import { message } from '../Utils.js'
import { fetchLanguage, fetchResources } from './DataFetcher.js'
import type { VersionId } from './Schemas.js'

const Resources: Record<string, ResourceManager | Promise<ResourceManager>> = {}

export async function getResources(version: VersionId) {
	if (!Resources[version]) {
		Resources[version] = (async () => {
			try {
				const { models, uvMapping, atlas} = await fetchResources(version)
				Resources[version] = new ResourceManager(models, uvMapping, atlas)
				return Resources[version]
			} catch (e) {
				console.error('Error: ', e)
				throw new Error(`Cannot get resources for version ${version}: ${message(e)}`)
			}
		})()
		return Resources[version]
	}
	return Resources[version]
}

const RENDER_SIZE = 128
const ItemRenderCache = new Map<string, Promise<string>>()

export async function renderItem(version: VersionId, item: ItemStack) {
	const cache_key = `${version} ${item.toString()}`
	const cached = ItemRenderCache.get(cache_key)
	if (cached !== undefined) {
		return cached
	}

	const promise = (async () => {
		const canvas = document.createElement('canvas')
		canvas.width = RENDER_SIZE
		canvas.height = RENDER_SIZE
		const resources = await getResources(version)
		const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true })
		if (!gl) {
			throw new Error('Cannot get WebGL2 context')
		}
		const renderer = new ItemRenderer(gl, item, resources)
		console.log('Rendering', item.toString())
		renderer.drawItem()
		return canvas.toDataURL()
	})()
	ItemRenderCache.set(cache_key, promise)
	return promise
}

export class ResourceManager implements BlockModelProvider, TextureAtlasProvider {
	private blockModels: { [id: string]: BlockModel }
	private textureAtlas: TextureAtlas

	constructor(models: Map<string, unknown>, uvMapping: any, textureAtlas: HTMLImageElement) {
		this.blockModels = {}
		this.textureAtlas = TextureAtlas.empty()
		this.loadBlockModels(models)
		this.loadBlockAtlas(textureAtlas, uvMapping)
	}

	public getBlockModel(id: Identifier) {
		return this.blockModels[id.toString()]
	}

	public getTextureUV(id: Identifier) {
		return this.textureAtlas.getTextureUV(id)
	}

	public getTextureAtlas() {
		return this.textureAtlas.getTextureAtlas()
	}

	private loadBlockModels(models: Map<string, unknown>) {
		[...models.entries()].forEach(([id, model]) => {
			this.blockModels[Identifier.create(id).toString()] = BlockModel.fromJson(id, model)
		})
		Object.values(this.blockModels).forEach(m => m.flatten(this))
	}

	private loadBlockAtlas(image: HTMLImageElement, textures: any) {
		const atlasCanvas = document.createElement('canvas')
		const w = upperPowerOfTwo(image.width)
		const h = upperPowerOfTwo(image.height)
		atlasCanvas.width = w
		atlasCanvas.height = h
		const ctx = atlasCanvas.getContext('2d')!
		ctx.drawImage(image, 0, 0)
		const imageData = ctx.getImageData(0, 0, w, h)

		const idMap: Record<string, UV> = {}
		Object.keys(textures).forEach(id => {
			const [u, v, du, dv] = textures[id]
			const dv2 = (du !== dv && id.startsWith('block/')) ? du : dv
			idMap[Identifier.create(id).toString()] = [u / w, v / h, (u + du) / w, (v + dv2) / h]
		})
		this.textureAtlas = new TextureAtlas(imageData, idMap)
	}
}

const Languages: Record<string, Record<string, string> | Promise<Record<string, string>>> = {}

export async function getLanguage(version: VersionId) {
	if (!Languages[version]) {
		Languages[version] = (async () => {
			try {
				Languages[version] = await fetchLanguage(version)
				return Languages[version]
			} catch (e) {
				console.error('Error: ', e)
				throw new Error(`Cannot get language for version ${version}: ${message(e)}`)
			}
		})()
		return Languages[version]
	}
	return Languages[version]
}

export async function getTranslation(version: VersionId, key: string, params?: string[]) {
	const lang = await getLanguage(version)
	const str = lang[key]
	if (!str) return null
	return replaceTranslation(str, params)
}

export function replaceTranslation(src: string, params?: string[]) {
	let out = ''
	let i = 0
	let p = 0
	while (i < src.length) {
		const c0 = src[i++]
		if (c0 === '%') { // percent character
			if (i >= src.length) { // INVALID: %<end>
				out += c0
				break
			}
			let c1 = src[i++]
			if (c1 === '%') { // escape
				out += '%'
			} else if (c1 === 's' || c1 === 'd') { // short form %s
				out += params?.[p++] ?? ''
			} else if (c1 >= '0' && c1 <= '9') {
				if (i >= src.length) { // INVALID: %2<end>
					out += c0 + c1
					break
				}
				let num = ''
				do {
					num += c1
					c1 = src[i++]
				} while (i < src.length && c1 >= '0' && c1 <= '9')
				if (c1 === '$') {
					if (i >= src.length) { // INVALID: %2$<end>
						out += c0 + num + c1
						break
					}
					const c2 = src[i++]
					if (c2 === 's' || c2 === 'd') { // long form %2$s
						const pos = parseInt(num) - 1
						if (!params || isNaN(pos) || pos < 0 || pos >= params.length) {
							out += ''
						} else {
							out += params[pos]
						}
					} else { // INVALID: %2$...
						out += c0 + num + c1
					}
				} else { // INVALID: %2...
					out += c0 + num
				}
			} else { // INVALID: %...
				out += c0
			}
		} else { // normal character
			out += c0
		}
	}
	return out
}

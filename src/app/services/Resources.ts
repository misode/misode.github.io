import { isObject } from '@spyglassmc/core'
import type { ItemComponentsProvider, ItemModelProvider } from 'deepslate'
import { ItemModel, NbtString } from 'deepslate'
import type { BlockDefinitionProvider, BlockFlagsProvider, BlockModelProvider, BlockPropertiesProvider, ItemStack, TextureAtlasProvider, UV } from 'deepslate/render'
import { BlockDefinition, BlockModel, Identifier, ItemRenderer, TextureAtlas, upperPowerOfTwo } from 'deepslate/render'
import config from '../Config.js'
import { jsonToNbt, message } from '../Utils.js'
import { fetchLanguage, fetchResources } from './DataFetcher.js'
import type { VersionId } from './Versions.js'
import { checkVersion } from './Versions.js'

const Resources: Record<string, ResourceManager | Promise<ResourceManager>> = {}

export async function getResources(version: VersionId, itemComponents: Map<string, Map<string, unknown>>) {
	if (!Resources[version]) {
		Resources[version] = (async () => {
			try {
				const { blockDefinitions, models, uvMapping, atlas, itemDefinitions } = await fetchResources(version)
				Resources[version] = new ResourceManager(version, blockDefinitions, models, uvMapping, atlas, itemDefinitions, itemComponents)
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

export async function renderItem(version: VersionId, item: ItemStack, baseComponents: Map<string, Map<string, unknown>>) {
	const cache_key = `${version} ${item.toString()}`
	const cached = ItemRenderCache.get(cache_key)
	if (cached !== undefined) {
		return cached
	}

	const promise = (async () => {
		const canvas = document.createElement('canvas')
		canvas.width = RENDER_SIZE
		canvas.height = RENDER_SIZE
		const resources = await getResources(version, baseComponents)
		const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true })
		if (!gl) {
			throw new Error('Cannot get WebGL2 context')
		}
		const renderer = new ItemRenderer(gl, item, resources, { display_context: 'gui' })
		renderer.drawItem()
		return canvas.toDataURL()
	})()
	ItemRenderCache.set(cache_key, promise)
	return promise
}

interface Resources extends BlockDefinitionProvider, BlockModelProvider, TextureAtlasProvider, BlockFlagsProvider, BlockPropertiesProvider, ItemModelProvider, ItemComponentsProvider {}

export class ResourceManager implements Resources {
	private readonly version: VersionId
	private readonly blockDefinitions: { [id: string]: BlockDefinition }
	private readonly blockModels: { [id: string]: BlockModel }
	private readonly itemModels: { [id: string]: ItemModel }
	private textureAtlas: TextureAtlas
	private readonly itemComponents: Map<string, Map<string, unknown>>

	constructor(version: VersionId, blockDefinitions: Map<string, unknown>, models: Map<string, unknown>, uvMapping: any, textureAtlas: HTMLImageElement, itemDefinitions: Map<string, unknown>, itemComponents: Map<string, Map<string, unknown>>) {
		this.version = version
		this.blockDefinitions = {}
		this.blockModels = {}
		this.itemModels = {}
		this.textureAtlas = TextureAtlas.empty()
		this.loadBlockDefinitions(blockDefinitions)
		this.loadBlockModels(models)
		this.loadBlockAtlas(textureAtlas, uvMapping)
		this.loadItemModels(itemDefinitions)
		this.itemComponents = itemComponents
	}

	public getBlockDefinition(id: Identifier) {
		return this.blockDefinitions[id.toString()]
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

	public getBlockFlags() {
		return { opaque: false }
	}

	public getBlockProperties() {
		return null
	}

	public getDefaultBlockProperties() {
		return null
	}

	public getItemModel(id: Identifier) {
		return this.itemModels[id.toString()]
	}

	public getItemComponents(id: Identifier) {
		const components = this.itemComponents.get(id.toString()) ?? new Map<string, unknown>()
		const result = new Map([...components.entries()].map(([k, v]) => [k, jsonToNbt(v)]))
		// Hack to make this version range work without needing another deepslate version
		if (checkVersion(this.version, '1.20.5', '1.21.2')) {
			result.set('minecraft:item_model', new NbtString(id.toString()))
		}
		return result
	}

	private loadBlockModels(models: Map<string, unknown>) {
		[...models.entries()].forEach(([id, model]) => {
			this.blockModels[Identifier.create(id).toString()] = BlockModel.fromJson(model)
		})
		Object.values(this.blockModels).forEach(m => m.flatten(this))
	}

	private loadBlockDefinitions(definitions: Map<string, unknown>) {
		[...definitions.entries()].forEach(([id, definition]) => {
			this.blockDefinitions[Identifier.create(id).toString()] = BlockDefinition.fromJson(definition)
		})
	}

	private loadItemModels(definitions: Map<string, unknown>) {
		[...definitions.entries()].forEach(([id, definition]) => {
			if (isObject(definition) && isObject((definition as any).model)) {
				this.itemModels[Identifier.create(id).toString()] = ItemModel.fromJson((definition as any).model)
			}
		})
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

export class ResourceWrapper implements Resources {
	constructor(
		private readonly wrapped: Resources,
		private readonly overrides: Partial<Resources>,
	) {}

	public getBlockDefinition(id: Identifier) {
		return this.overrides.getBlockDefinition?.(id) ?? this.wrapped.getBlockDefinition(id)
	}

	public getBlockModel(id: Identifier) {
		return this.overrides.getBlockModel?.(id) ?? this.wrapped.getBlockModel(id)
	}

	public getTextureUV(texture: Identifier) {
		return this.overrides.getTextureUV?.(texture) ?? this.wrapped.getTextureUV(texture)
	}

	public getTextureAtlas() {
		return this.overrides.getTextureAtlas?.() ?? this.wrapped.getTextureAtlas()
	}

	public getBlockFlags(id: Identifier) {
		return this.overrides.getBlockFlags?.(id) ?? this.wrapped.getBlockFlags(id)
	}

	public getBlockProperties(id: Identifier) {
		return this.overrides.getBlockProperties?.(id) ?? this.wrapped.getBlockProperties(id)
	}

	public getDefaultBlockProperties(id: Identifier) {
		return this.overrides.getDefaultBlockProperties?.(id) ?? this.wrapped.getDefaultBlockProperties(id)
	}

	public getItemModel(id: Identifier) {
		return this.overrides.getItemModel?.(id) ?? this.wrapped.getItemModel(id)
	}

	public getItemComponents(id: Identifier) {
		return this.overrides.getItemComponents?.(id) ?? this.wrapped.getItemComponents(id)
	}
}

export type Language = Record<string, string>

const Languages: Record<string, Language | Promise<Language>> = {}

export async function getLanguage(version: VersionId, lang: string = 'en') {
	const mcLang = config.languages.find(l => l.code === lang)?.mc ?? 'en_us'
	const cacheKey = `${version}_${mcLang}`
	if (!Languages[cacheKey]) {
		Languages[cacheKey] = (async () => {
			try {
				Languages[cacheKey] = await fetchLanguage(version, mcLang)
				return Languages[cacheKey]
			} catch (e) {
				console.error('Error: ', e)
				throw new Error(`Cannot get language '${mcLang}' for version ${version}: ${message(e)}`)
			}
		})()
		return Languages[cacheKey]
	}
	return Languages[cacheKey]
}

export function getTranslation(lang: Language, key: string, params?: string[]) {
	const str = lang[key]
	if (!str) return undefined
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

import type { BlockModelProvider, TextureAtlasProvider, UV } from 'deepslate/render'
import { BlockModel, Identifier, TextureAtlas, upperPowerOfTwo } from 'deepslate/render'
import { message } from '../Utils.js'
import { fetchResources } from './DataFetcher.js'
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

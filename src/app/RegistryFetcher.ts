import { CollectionRegistry } from '@mcschema/core'
import config from '../config.json'

const baseUrl = 'https://raw.githubusercontent.com/Arcensoth/mcdata'
export const mcdata = (ref: string, registry: string) => {
  return `${baseUrl}/${ref}/processed/reports/registries/${registry}/data.min.json`
}

export const RegistryFetcher = async (target: CollectionRegistry, versionId: string) => {
  const version = config.versions.find(v => v.id === versionId)
  if (!version) return
  await Promise.all(config.registries.map(async r => {
    const id = typeof r === 'string' ? r : r.id
    const url = typeof r === 'string'
        ? mcdata(version.mcdata_ref, r)
        : `${baseUrl}/${version.mcdata_ref}/${r.path}`
    try {
      const res = await fetch(url)
      const data = await res.json()
      console.log(r, url, data)
      target.register(id, data.values)
    } catch (e) {
      console.error(`Error occurred while fetching registry "${id}":`, e)
    }
  }))
}

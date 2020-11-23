import { CollectionRegistry } from '@mcschema/core'
import { checkVersion } from './App'
import config from '../config.json'

const localStorageCache = (version: string) => `cache_${version}`
declare var __MCDATA_MASTER_HASH__: string;

const baseUrl = 'https://raw.githubusercontent.com/Arcensoth/mcdata'
export const mcdata = (ref: string, registry: string) => {
  return `${baseUrl}/${ref}/processed/reports/registries/${registry}/data.min.json`
}

export const RegistryFetcher = async (target: CollectionRegistry, versionId: string) => {
  const version = config.versions.find(v => v.id === versionId)
  if (!version) return

  const cache = JSON.parse(localStorage.getItem(localStorageCache(versionId)) ?? '{}')
  const cacheValid = version.mcdata_ref !== 'master' || cache.mcdata_hash === __MCDATA_MASTER_HASH__
  let cacheDirty = false

  await Promise.all(config.registries.map(async r => {
    const id = typeof r === 'string' ? r : r.id

    if (typeof r !== 'string' && r.minVersion) {
      if (!checkVersion(versionId, r.minVersion)) return
    }

    if (!cache.registries) {
      cache.registries = {}
    }
    if (cacheValid && cache.registries?.[id]) {
      target.register(id, cache.registries[id])
      return
    }

    const url = typeof r !== 'string' && r.path
      ? `${baseUrl}/${version.mcdata_ref}/${r.path}/data.min.json`
      : mcdata(version.mcdata_ref, typeof r === 'string' ? r : r.id)

    try {
      const res = await fetch(url)
      const data = await res.json()

      target.register(id, data.values)
      cache.registries[id] = data.values
      cacheDirty = true
    } catch (e) {
      console.warn(`Error occurred while fetching registry "${id}":`, e)
    }
  }))

  if (cacheDirty) {
    if (version.mcdata_ref === 'master') {
      cache.mcdata_hash = __MCDATA_MASTER_HASH__
    }
    localStorage.setItem(localStorageCache(versionId), JSON.stringify(cache))
  }
}

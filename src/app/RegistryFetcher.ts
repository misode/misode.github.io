import { CollectionRegistry } from '@mcschema/core'
import { checkVersion } from './App'
import config from '../config.json'

type RegistryConfig = {
  id: string
  minVersion?: string
  maxVersion?: string
  path?: string
}

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

  if (checkVersion('1.15', versionId)) {
    const url = `${baseUrl}/${version.mcdata_ref}/generated/reports/registries.json`
    if (cacheValid && cache.registries) {
      config.registries.forEach((r: string | RegistryConfig) => {
        if (typeof r === 'string') r = { id: r }
        if (!checkVersion(versionId, r.minVersion, r.maxVersion)) return

        target.register(r.id, cache.registries[r.id])
      })
    } else {
      try {
        const res = await fetch(url)
        const data = await res.json()
        config.registries.forEach(async (r: string | RegistryConfig) => {
          if (typeof r === 'string') r = { id: r }
          if (!checkVersion(versionId, r.minVersion, r.maxVersion)) return

          if (!cache.registries) cache.registries = {}
          const values = Object.keys(data[`minecraft:${r.id}`].entries)
          target.register(r.id, values)
          cache.registries[r.id] = values
          cacheDirty = true
        })
      } catch (e) {
        console.warn(`Error occurred while fetching registries for version ${versionId}`)
      }
    }
  } else {
    await Promise.all(config.registries.map(async (r: string | RegistryConfig) => {
      if (typeof r === 'string') r = { id: r }
  
      if (r.minVersion && !checkVersion(versionId, r.minVersion)) return
      if (r.maxVersion && !checkVersion(r.maxVersion, versionId)) return
  
      if (!cache.registries) cache.registries = {}
      if (cacheValid && cache.registries?.[r.id]) {
        target.register(r.id, cache.registries[r.id])
        return
      }
  
      const url = r.path
        ? `${baseUrl}/${version.mcdata_ref}/${r.path}/data.min.json`
        : mcdata(version.mcdata_ref, typeof r === 'string' ? r : r.id)
  
      try {
        const res = await fetch(url)
        const data = await res.json()
  
        target.register(r.id, data.values)
        cache.registries[r.id] = data.values
        cacheDirty = true
      } catch (e) {
        console.warn(`Error occurred while fetching registry "${r.id}":`, e)
      }
    }))
  }

  if (cacheDirty) {
    if (version.mcdata_ref === 'master') {
      cache.mcdata_hash = __MCDATA_MASTER_HASH__
    }
    localStorage.setItem(localStorageCache(versionId), JSON.stringify(cache))
  }
}

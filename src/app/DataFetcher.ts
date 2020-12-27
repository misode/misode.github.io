import { CollectionRegistry } from '@mcschema/core'
import { BlockStateRegistry, checkVersion } from './App'
import config from '../config.json'

const CACHE_FORMAT = 1

type VersionConfig = {
  id: string,
  mcdata_ref: string,
  vanilla_datapack_summary_ref?: string
}

const localStorageCache = (version: string) => `cache_${version}`
declare var __MCDATA_MASTER_HASH__: string;
declare var __VANILLA_DATAPACK_SUMMARY_HASH__: string;

const mcdataUrl = 'https://raw.githubusercontent.com/Arcensoth/mcdata'
const vanillaDatapackUrl = 'https://raw.githubusercontent.com/SPGoding/vanilla-datapack'

export const fetchData = async (target: CollectionRegistry, versionId: string) => {
  const version = config.versions.find(v => v.id === versionId)
  if (!version) return

  const cache = JSON.parse(localStorage.getItem(localStorageCache(versionId)) ?? '{}')
  const mcdataCacheValid = cache.format === CACHE_FORMAT && (version.mcdata_ref !== 'master' || cache.mcdata_hash === __MCDATA_MASTER_HASH__)
  const vanillaDatapackCacheValid = cache.format === CACHE_FORMAT && (version.vanilla_datapack_summary_ref !== 'summary' || cache.vanilla_datapack_summary_hash === __VANILLA_DATAPACK_SUMMARY_HASH__)

  await Promise.all([
    fetchRegistries(target, version, cache, mcdataCacheValid),
    fetchBlockStateMap(version, cache, mcdataCacheValid),
    fetchDynamicRegistries(target, version, cache, vanillaDatapackCacheValid)
  ])

  if (!mcdataCacheValid || !vanillaDatapackCacheValid) {
    cache.mcdata_hash = __MCDATA_MASTER_HASH__
    cache.vanilla_datapack_summary_hash = __VANILLA_DATAPACK_SUMMARY_HASH__
    cache.format = CACHE_FORMAT
    localStorage.setItem(localStorageCache(versionId), JSON.stringify(cache))
  }
}

const fetchRegistries = async (target: CollectionRegistry, version: VersionConfig, cache: any, cacheValid: boolean) => {
  const registries = config.registries
    .filter(r => !r.dynamic)
    .filter(r => checkVersion(version.id, r.minVersion, r.maxVersion))

  if (cacheValid && cache.registries) {
    registries.forEach(r => {
      target.register(r.id, cache.registries[r.id])
    })
    return
  }

  cache.registries = {}
  if (checkVersion(version.id, undefined, '1.15')) {
    const url = `${mcdataUrl}/${version.mcdata_ref}/generated/reports/registries.json`
    try {
      const res = await fetch(url)
      const data = await res.json()
      registries.forEach(async r => {
        const values = Object.keys(data[`minecraft:${r.id}`].entries)
        target.register(r.id, values)
        cache.registries[r.id] = values
      })
    } catch (e) {
      console.warn(`Error occurred while fetching registries for version ${version.id}`)
    }
  } else {
    await Promise.all(registries.map(async r => {
      const url = r.path
        ? `${mcdataUrl}/${version.mcdata_ref}/${r.path}/data.min.json`
        : `${mcdataUrl}/${version.mcdata_ref}/processed/reports/registries/${r.id}/data.min.json`
  
      try {
        const res = await fetch(url)
        const data = await res.json()
  
        target.register(r.id, data.values)
        cache.registries[r.id] = data.values
      } catch (e) {
        console.warn(`Error occurred while fetching registry "${r.id}":`, e)
      }
    }))
  }
}

const fetchBlockStateMap = async (version: VersionConfig, cache: any, cacheValid: boolean) => {
  if (cacheValid && cache.block_state_map) {
    Object.keys(cache.block_state_map).forEach(block => {
      BlockStateRegistry[block] = cache.block_state_map[block]
    })
    return
  }

  cache.block_state_map = {}
  const url = (checkVersion(version.id, undefined, '1.15'))
    ? `${mcdataUrl}/${version.mcdata_ref}/generated/reports/blocks.json`
    : `${mcdataUrl}/${version.mcdata_ref}/processed/reports/blocks/data.min.json`

  const res = await fetch(url)
  const data = await res.json()

  Object.keys(data).forEach(block => {
    const res = {
      properties: data[block].properties,
      default: data[block].states.find((s: any) => s.default).properties
    }
    BlockStateRegistry[block] = res
    cache.block_state_map[block] = res
  })
}

const fetchDynamicRegistries = async (target: CollectionRegistry, version: VersionConfig, cache: any, cacheValid: boolean) => {
  const registries = config.registries
    .filter(r => r.dynamic)
    .filter(r => checkVersion(version.id, r.minVersion, r.maxVersion))

  if (cacheValid && cache.dynamic_registries) {
    registries.forEach(r => {
      target.register(r.id, cache.dynamic_registries[r.id])
    })
    return
  }

  cache.dynamic_registries = {}
  if (checkVersion(version.id, '1.16')) {
    try {
      const res = await fetch(`${vanillaDatapackUrl}/${version.vanilla_datapack_summary_ref}/summary/flattened.min.json`)
      const data = await res.json()
      registries.forEach(r => {
        target.register(r.id, data[r.id])
        cache.dynamic_registries[r.id] = data[r.id]
      })
    } catch (e) {
      console.warn(`Error occurred while fetching dynamic registries:`, e)
    }
  }
}

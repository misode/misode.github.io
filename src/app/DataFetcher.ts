import { CollectionRegistry } from '@mcschema/core'
import { App, BlockStateRegistry, checkVersion } from './App'
import config from '../config.json'

['1.15', '1.16', '1.17'].forEach(v => localStorage.removeItem(`cache_${v}`))

const CACHE_NAME = `misode-v1`

type VersionRef = 'mcdata_master' | 'vanilla_datapack_summary' | 'vanilla_datapack_data'

type Version = {
  id: string,
  refs: Partial<{ [key in VersionRef]: string }>,
  dynamic?: boolean,
}

declare var __MCDATA_MASTER_HASH__: string;
declare var __VANILLA_DATAPACK_SUMMARY_HASH__: string;

const mcdataUrl = 'https://raw.githubusercontent.com/Arcensoth/mcdata'
const vanillaDatapackUrl = 'https://raw.githubusercontent.com/SPGoding/vanilla-datapack'

const refs: {
  id: VersionRef,
  hash: string,
  url: string
}[] = [
  {
    id: 'mcdata_master',
    hash: __MCDATA_MASTER_HASH__,
    url: mcdataUrl
  },
  {
    id: 'vanilla_datapack_summary',
    hash: __VANILLA_DATAPACK_SUMMARY_HASH__,
    url: vanillaDatapackUrl
  },
]

export async function fetchData(target: CollectionRegistry, versionId: string) {
  const version = config.versions.find(v => v.id === versionId) as Version | undefined
  if (!version) return
  
  if (version.dynamic) {
    await Promise.all(refs
      .filter(r => localStorage.getItem(`cached_${r.id}`) !== r.hash)
      .map(async r => {
        await deleteMatching(url => url.startsWith(`${r.url}/${version.refs[r.id]}`))
        localStorage.setItem(`cached_${r.id}`, r.hash)
      }))
  }

  await Promise.all([
    fetchRegistries(version, target),
    fetchBlockStateMap(version),
    fetchDynamicRegistries(version, target)
  ])
}

async function fetchRegistries(version: Version, target: CollectionRegistry) {
  const registries = config.registries
    .filter(r => !r.dynamic)
    .filter(r => checkVersion(version.id, r.minVersion, r.maxVersion))

  if (checkVersion(version.id, undefined, '1.15')) {
    const url = `${mcdataUrl}/${version.refs.mcdata_master}/generated/reports/registries.json`
    try {
      const data = await getData(url, (data) => {
        const res: {[id: string]: string[]} = {}
        Object.keys(data).forEach(k => {
          res[k.slice(10)] = Object.keys(data[k].entries)
        })
        return res
      })
      registries.forEach(r => {
        target.register(r.id, data[r.id] ?? [])
      })
    } catch (e) {
      console.warn(`Error occurred while fetching registries:`, e)
    }
  } else {
    return Promise.all(registries.map(async r => {
      try {
        const url = r.path
          ? `${mcdataUrl}/${version.refs.mcdata_master}/${r.path}/data.min.json`
          : `${mcdataUrl}/${version.refs.mcdata_master}/processed/reports/registries/${r.id}/data.min.json`
        target.register(r.id, await getData(url, v => v.values))
      } catch (e) {
        console.warn(`Error occurred while registry ${r.id}:`, e)
      }
    }))
  }
}

async function fetchBlockStateMap(version: Version) {
  const url = (checkVersion(version.id, undefined, '1.15'))
    ? `${mcdataUrl}/${version.refs.mcdata_master}/generated/reports/blocks.json`
    : `${mcdataUrl}/${version.refs.mcdata_master}/processed/reports/blocks/data.min.json`

  try {
    const data = await getData(url, (data) => {
      const res: BlockStateRegistry = {}
      Object.keys(data).forEach(b => {
        res[b] = {
          properties: data[b].properties,
          default: data[b].states.find((s: any) => s.default).properties
        }
      })
      return res
    })
    App.blockStateRegistry = data
  } catch (e) {
    console.warn(`Error occurred while fetching block state map:`, e)
  }
}

async function fetchDynamicRegistries(version: Version, target: CollectionRegistry) {
  const registries = config.registries
    .filter(r => r.dynamic)
    .filter(r => checkVersion(version.id, r.minVersion, r.maxVersion))

  if (checkVersion(version.id, '1.16')) {
    const url = `${vanillaDatapackUrl}/${version.refs.vanilla_datapack_summary}/summary/flattened.min.json`
    try {
      const data = await getData(url)
      registries.forEach(r => {
        target.register(r.id, data[r.id])
      })
    } catch (e) {
      console.warn(`Error occurred while fetching dynamic registries:`, e)
    }
  }
}

export async function fetchPreset(version: Version, registry: string, id: string) {
  try {
    const res = await fetch(`${vanillaDatapackUrl}/${version.refs.vanilla_datapack_data}/data/minecraft/${registry}/${id}.json`)
    return await res.json()
  } catch (e) {
    console.warn(`Error occurred while fetching ${registry} preset ${id}:`, e)
  }
}

async function getData<T = any>(url: string, fn: (v: any) => T = (v: any) => v): Promise<T> {
  const cache = await caches.open(CACHE_NAME)
  const cacheResponse = await cache.match(url)

  if (cacheResponse && cacheResponse.ok) {
    return await cacheResponse.json()
  }

  const fetchResponse = await fetch(url)
  const responseData = fn(await fetchResponse.json())
  await cache.put(url, new Response(JSON.stringify(responseData)))
  return responseData
}

async function deleteMatching(matches: (url: string) => boolean) {
  const cache = await caches.open(CACHE_NAME)
  const promises: Promise<boolean>[] = []

  for (const request of await cache.keys()) {
    if (matches(request.url)) {
      promises.push(cache.delete(request))
    }
  }
  return (await Promise.all(promises)).length > 0
}

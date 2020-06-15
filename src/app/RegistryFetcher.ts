import { CollectionRegistry } from "minecraft-schemas";

export const mcdata = (version: string, registry: string) => `https://raw.githubusercontent.com/Arcensoth/mcdata/${version}/processed/reports/registries/${registry}/${registry}.min.json`

export const RegistryFetcher = async (target: CollectionRegistry, registries: string[], version = 'master') => {
  await Promise.all(registries.map(async r => {
    const res = await fetch(mcdata(version, r))
    const data = await res.json()
    target.register(r, data.values)
  }))
}

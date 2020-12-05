import { Hook, ModelPath, Path } from '@mcschema/core'
import { App, Previews } from '../App'
import { Octicon } from '../components/Octicon'
import { locale } from '../Locales'
import { Mounter } from '../views/View'
import { BiomeNoisePreview } from '../preview/BiomeNoisePreview'
import { Preview } from '../preview/Preview'
import { Tracker } from '../Tracker'

export const suffixInjector: Hook<[Mounter], string | void> = {
  base() {},
  boolean() {},
  list() {},
  map() {},
  number() {},

  choice({ switchNode }, path, mounter) {
    return switchNode.hook(this, path, mounter)
  },

  object({}, path, mounter) {
    if (Previews.biome_noise.active(path)) {
      return setPreview(Previews.biome_noise, path, mounter)
    }
    if (Previews.noise_settings.active(path)) {
      return setPreview(Previews.noise_settings, path, mounter)
    }
  },

  string({}, path, mounter) {
    if (path.endsWith(new Path(['biome']))
      && path.pop().pop().endsWith(new Path(['generator', 'biome_source', 'biomes']))) {
        const biomePreview = Previews.biome_noise as BiomeNoisePreview
        const biome = path.get()
        const id = mounter.onChange(el => {
          biomePreview.setBiomeColor(biome, (el as HTMLInputElement).value)
        })
        return `<input type="color" value="${biomePreview.getBiomeHex(biome)}" data-id=${id}></input>`
    }
  }
}

function setPreview(preview: Preview, path: ModelPath, mounter: Mounter) {
  const id = mounter.onClick(() => {
    Tracker.setPreview(preview.getName())
    preview.path = path
    App.preview.set(preview)
  })
  return `<button data-id=${id}>${locale('preview')} ${Octicon.play}</button>`
}

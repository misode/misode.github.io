import { DataModel } from '@mcschema/core';
import { App, Previews } from '../../app_';
import { BiomeNoisePreview } from '../../preview/BiomeNoisePreview';
import { Tracker } from '../../Tracker';
import { View } from '../../views/View';
import { Octicon } from '../Octicon';

export const PreviewPanel = (view: View, model: DataModel) => {
  const canvas = view.register(el => {
    const redraw = () => {
      const preview = App.preview.get()
      if (preview && preview.path && preview.path.withModel(model).get()) {
        const ctx = (el as HTMLCanvasElement).getContext('2d')!
        const img = ctx.createImageData(200, 100)
        const newState = preview.path.withModel(model).get()
        preview.state = JSON.parse(JSON.stringify(newState))
        preview.draw(model, img)
        ctx.putImageData(img, 0, 0)
      } else {
        App.preview.set(null)
      }
    }
    model.addListener({
      invalidated: redraw
    })
    App.preview.watchRun((value) => {
      if (value) {
        redraw()
      }
    }, 'preview-panel')

    ;(Previews.biome_noise as BiomeNoisePreview).biomeColors.watch(() => {
      if (App.preview.get()?.getName() === 'biome-noise') {
        redraw()
      }
    }, 'preview-panel')

    let dragStart: number[] | undefined
    (el as HTMLCanvasElement).addEventListener('mousedown', evt => {
      dragStart = [evt.offsetX, evt.offsetY]
    })
    ;(el as HTMLCanvasElement).addEventListener('mousemove', evt => {
      if (dragStart === undefined) return
      if (App.preview.get()?.onDrag) {
        App.preview.get()?.onDrag(dragStart[0], dragStart[1], evt.offsetX, evt.offsetY)
        redraw()
      }
      dragStart = [evt.offsetX, evt.offsetY]
    })
    ;(el as HTMLCanvasElement).addEventListener('mouseup', evt => {
      dragStart = undefined
    })
  })
  return `<div class="panel preview-panel">
    <div class="panel-controls">
      <div class="btn" data-id="${view.onClick(() => {
        Tracker.hidePreview(); App.preview.set(null)
      })}">
        ${Octicon.x}
      </div>
    </div>
    <canvas width="200" height="100" data-id="${canvas}">
  </div>`
}

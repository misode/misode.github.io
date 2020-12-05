import { DataModel } from '@mcschema/core';
import { App } from '../../App';
import { Tracker } from '../../Tracker';
import { View } from '../../views/View';
import { Octicon } from '../Octicon';

export const PreviewPanel = (view: View, model: DataModel) => {
  const panel = view.register(el => {
    const canvas = el.querySelector('canvas')!
    const redraw = () => {
      const preview = App.preview.get()
      if (preview && preview.path && preview.path.withModel(model).get()) {
        const ctx = canvas.getContext('2d')!
        const newState = preview.path.withModel(model).get()
        preview.state = JSON.parse(JSON.stringify(newState))
        const [width, height] = preview.getSize()
        canvas.width = width
        canvas.height = height
        const img = ctx.createImageData(width, height)
        preview.draw(model, img)
        ctx.putImageData(img, 0, 0)
      } else {
        App.preview.set(null)
      }
    }
    view.mount(el.querySelector('.panel-controls')!, `
      ${App.preview.get()?.menu(view, redraw) ?? ''}
      <div class="btn" data-id="${view.onClick(() => {
        Tracker.hidePreview(); App.preview.set(null)
      })}">
        ${Octicon.x}
      </div>`, false)
    model.addListener({
      invalidated: redraw
    })
    App.preview.watchRun((value) => {
      if (value) {
        value.redraw = redraw
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
        const [width, height] = App.preview.get()!.getSize()
        const dx = (evt.offsetX - dragStart[0]) * width / canvas.clientWidth
        const dy = (evt.offsetY - dragStart[1]) * height / canvas.clientHeight
        if (!(dx === 0 && dy === 0)) {
          App.preview.get()?.onDrag(dx, dy)
          redraw()
        }
      }
      dragStart = [evt.offsetX, evt.offsetY]
    })
    ;(el as HTMLCanvasElement).addEventListener('mouseup', evt => {
      dragStart = undefined
    })
  })
  return `<div class="panel preview-panel" data-id="${panel}">
    <div class="panel-controls"></div>
    <canvas width="512" height="256">
  </div>`
}

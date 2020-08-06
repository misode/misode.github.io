import { AbstractView, DataModel, Path } from "@mcschema/core";
import { BiomeNoiseVisualizer } from "./BiomeNoiseVisualizer";

export interface Visualizer {
  path(): Path
  active(model: DataModel): boolean
  dirty(model: DataModel): boolean
  draw(model: DataModel, img: ImageData): void
  onDrag?(from: number[], to: number[]): void
}

export class VisualizerView extends AbstractView {
  ctx: CanvasRenderingContext2D
  visualizer?: Visualizer
  active: boolean
  canvas: HTMLElement
  sourceView: HTMLElement
  gutter: HTMLElement
  lastHeight?: string
  dragStart?: number[]

  constructor(model: DataModel, canvas: HTMLCanvasElement) {
    super(model)
    this.ctx = canvas.getContext('2d')!
    this.active = false
    this.canvas = canvas
    this.gutter = canvas.parentElement!.querySelector('.gutter') as HTMLElement
    this.sourceView = canvas.parentElement!.getElementsByTagName('textarea')[0] as HTMLElement

    canvas.addEventListener('mousedown', evt => {
      this.dragStart = [evt.offsetX, evt.offsetY]
    })
    canvas.addEventListener('mousemove', evt => {
      if (this.dragStart === undefined) return
      if (this.visualizer?.onDrag) {
        this.visualizer.onDrag(this.dragStart, [evt.offsetX, evt.offsetY])
      }
      this.dragStart = [evt.offsetX, evt.offsetY]
      this.invalidated()
    })
    canvas.addEventListener('mouseup', evt => {
      this.dragStart = undefined
    })
  }

  invalidated() {
    if (this.active && this.visualizer && this.visualizer.active(this.model)) {
      if (this.visualizer.dirty(this.model)) {
        const img = this.ctx.createImageData(200, 100)
        this.visualizer.draw(this.model, img)
        this.ctx.putImageData(img, 0, 0)
      }
      this.canvas.style.display = 'block'
      this.gutter.style.display = 'block'
      if (this.lastHeight) {
        this.sourceView.style.height = this.lastHeight
        this.lastHeight = undefined
      }
    } else {
      this.canvas.style.display = 'none'
      this.gutter.style.display = 'none'
      this.lastHeight = this.sourceView.style.height
      this.sourceView.style.height = '100%'
      this.ctx.clearRect(0, 0, 200, 100)
    }
  }

  set(visualizer: Visualizer) {
    this.active = true
    this.visualizer = visualizer
    this.invalidated()
  }

  static visualizers: {[key: string]: Visualizer} = {
    'biome-noise': new BiomeNoiseVisualizer()
  }
}

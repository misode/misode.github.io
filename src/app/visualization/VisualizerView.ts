import { AbstractView, DataModel, Path, ModelPath } from "@mcschema/core"
import { BiomeNoiseVisualizer } from "./BiomeNoiseVisualizer"
import { NoiseSettingsVisualizer } from "./NoiseSettingsVisualizer"
import { Visualizer } from "./Visualizer"

export class VisualizerView extends AbstractView {
  ctx: CanvasRenderingContext2D
  visualizer?: Visualizer
  active: boolean
  path?: ModelPath
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
        this.visualizer.state = {}
        this.invalidated()
      }
      this.dragStart = [evt.offsetX, evt.offsetY]
    })
    canvas.addEventListener('mouseup', evt => {
      this.dragStart = undefined
    })
  }

  invalidated() {
    this.path = this.path?.withModel(this.model)
    let newState: any
    if (this.active && this.visualizer && this.path
        && this.visualizer.active(this.path)
        && (newState = this.path.get())) {
      if (newState && this.visualizer.dirty(this.path)) {
        const img = this.ctx.createImageData(200, 100)
        this.visualizer.state = JSON.parse(JSON.stringify(newState))
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
    }
  }

  set(visualizer: Visualizer, path: ModelPath) {
    this.active = true
    this.visualizer = visualizer
    this.path = path
    this.visualizer.state = undefined
    this.invalidated()
  }
  
  static visualizers: Visualizer[] = [
    new BiomeNoiseVisualizer(),
    new NoiseSettingsVisualizer()
  ]
}

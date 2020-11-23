import { App, checkVersion, Models } from '../app_'
import { View } from './View'
import { Header } from '../components/Header'
import { SplitGroup } from '../components/SplitGroup'
import { Errors } from '../components/Errors'
import { TreePanel } from '../components/panels/TreePanel'
import { SourcePanel } from '../components/panels/SourcePanel'
import { PreviewPanel } from '../components/panels/PreviewPanel'

export const Generator = (view: View): string => {
  const model = Models[App.model.get()!.id]
  model.listeners = []
  const getSideContent = () => {
    return App.preview.get() ? 
      SplitGroup(view, { direction: 'vertical', sizes: [60, 40] }, [
        SourcePanel(view, model),
        PreviewPanel(view, model)
      ])
    : SourcePanel(view, model)
  }
  const validatePreview = () => {
    const preview = App.preview.get()
    const path = preview?.path?.withModel(model)
    if (!(path && path.get() && preview?.active(path))) {
      App.preview.set(null)
    }
  }
  model.addListener({
    invalidated: validatePreview
  })
  App.schemasLoaded.watch((value) => {
    if (value) {
      model.validate()
      model.invalidate()
      validatePreview()
    }
  }, 'generator')
  App.localesLoaded.watch((value) => {
    if (value && App.schemasLoaded.get()) {
      model.invalidate()
    }
  }, 'generator')
  App.version.watchRun((value) => {
    const minVersion = App.model.get()!.minVersion
    if (minVersion && !checkVersion(value, minVersion)) {
      App.version.set(minVersion)
    }
  }, 'generator')
  const sideContent = view.register(el => {
    App.preview.watch((value, oldValue) => {
      if (!value || !oldValue) {
        view.mount(el, getSideContent(), false)
      }
    }, 'generator')
  })
  const homeLink = typeof App.model.get()!.category === 'string' ? `/${App.model.get()!.category}/` : undefined
  return `${Header(view, `${App.model.get()!.name} Generator`, homeLink, true)}
    <div class="content">
      ${SplitGroup(view, { direction: "horizontal", sizes: [66, 34] }, [
        TreePanel(view, model),
        `<div class="content-output" data-id="${sideContent}">${getSideContent()}</div>`
      ])}
    </div>
    ${Errors(view, model)}`
}

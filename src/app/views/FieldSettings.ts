import { App } from '../App'
import { Header } from '../components/Header'
import { Octicon } from '../components/Octicon'
import { View } from './View'

export const FieldSettings = (view: View): string => {
  const fieldListId = view.register(fieldList => {
    const getFields = () => {
      const fields = App.settings.fields
      return fields.map((f, i) => {
        const pathInput = view.register(el => {
          (el as HTMLInputElement).value = f.path ?? ''
          el.addEventListener('change', () => {
            fields[i] = {...f, path: (el as HTMLSelectElement).value}
            App.settings.save()
            view.mount(fieldList, getFields(), false)
          })
        })
        const nameInput = view.register(el => {
          (el as HTMLInputElement).value = f.name ?? ''
          el.addEventListener('change', () => {
            fields[i] = {...f, name: (el as HTMLSelectElement).value}
            App.settings.save()
            view.mount(fieldList, getFields(), false)
          })
        })
        return `<li>
          <div class="field-prop">
            <label>Path</label><input size="30" data-id="${pathInput}">
          </div>
          <div class="field-prop">
            <label>Name</label><input data-id="${nameInput}">
          </div>
          <div class="field-prop">
            <span ${f?.hidden ? 'class="hidden"' : ''} data-id="${view.onClick(() => {
              fields[i].hidden = f?.hidden ? undefined : true
              App.settings.save()
              view.mount(fieldList, getFields(), false)
            })}">${f.hidden ? Octicon.eye_closed : Octicon.eye}</span>
            <span class="dimmed" data-id="${view.onClick(() => {
              fields.splice(i, 1)
              App.settings.save()
              view.mount(fieldList, getFields(), false)
            })}">${Octicon.trashcan}</span>
          </div>
        </li>`
      }).join('')
    }
    view.mount(fieldList, getFields(), false)
  })
  
  return `${Header(view, 'Field Settings')}
    <div class="settings">
      <p>
        Customize advanced field settings
      </p>
      <ul class="field-list" data-id="${fieldListId}"></ul>
    </div>`
}

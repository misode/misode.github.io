import { Property } from '../state/Property';
import { View } from '../views/View';
import { Octicon } from './Octicon';

export const Dropdown = (view: View, icon: keyof typeof Octicon, entries: [string, string][], state: Property<string>, watcher?: (value: string) => void) => {
  const dropdown = view.register(el => {
    el.addEventListener('change', () => {
      state.set((el as HTMLSelectElement).value)
    })
    state.watchRun(v => (el as HTMLSelectElement).value = v, 'dropdown')
    watcher?.(state.get())
  })
  return `
  <div class="dropdown">
    <select data-id="${dropdown}">
      ${entries.map(e => `
        <option value=${e[0]}>${e[1]}</option>
      `).join('')}
    </select>
    ${Octicon[icon]}
  </div>`
}

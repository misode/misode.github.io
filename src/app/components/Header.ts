import { App } from '../App';
import { View } from '../views/View';
import { Dropdown } from './Dropdown';
import { Octicon } from './Octicon';
import { Toggle } from './Toggle';
import { languages } from '../../config.json'
import { Tracker } from '../Tracker';

export const Header = (view: View, title: string, homeLink = '/') => {
  const panelTogglesId = view.register(el => {
    const getPanelToggles = () => {
      const panels = [['preview', 'play'], ['tree', 'note'], ['source', 'code']]
      if (!panels.map(e => e[0]).includes(App.mobilePanel.get())) return ''
      return panels
        .filter(e => e[0] !== App.mobilePanel.get())
        .filter(e => e[0] !== 'preview' || App.preview.get() !== null)
        .map(e => `<div data-id="${view.onClick(() => App.mobilePanel.set(e[0]))}">
          ${Octicon[e[1] as keyof typeof Octicon]}
        </div>`).join('')
    }
    App.mobilePanel.watchRun(() => {
      view.mount(el, getPanelToggles(), false)
    })
    App.preview.watchRun((value, oldValue) => {
      if (value === null && App.mobilePanel.get() === 'preview') {
        App.mobilePanel.set('tree')
      }
      if (value === null || oldValue === null) {
        view.mount(el, getPanelToggles(), false)
      }
    })
  })
  
  return `<header>
    <div class="header-title">
      <a data-link href="${homeLink}" class="home-link">${Octicon.three_bars}</a>
      <h2>${title}</h2>
    </div>
    <nav>
      <div class="panel-toggles" data-id="${panelTogglesId}"></div>
      <ul>
        <li>${Dropdown(view, 'globe', languages.map(l => [l.code, l.name]), App.language, Tracker.setLanguage)}</li>
        <li>${Toggle(view, [['dark', 'sun'], ['light', 'moon']], App.theme, Tracker.setTheme)}</li>
        <li>
          <a data-link href="/settings/fields/">
            ${Octicon.gear}
          </a>
        </li>
        <li class="dimmed">
          <a href="https://github.com/misode/misode.github.io" target="_blank">
            ${Octicon.mark_github}
          </a>
        </li>
      </ul>
    </nav>
  </header>`
}

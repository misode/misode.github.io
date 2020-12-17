import { App } from '../App';
import { View } from '../views/View';
import { Dropdown } from './Dropdown';
import { Octicon } from './Octicon';
import { Toggle } from './Toggle';
import { languages } from '../../config.json'
import { Tracker } from '../Tracker';

export const Header = (view: View, title: string, homeLink = '/', panelToggleVisible = false) => `
  <header>
    <div class="header-title">
      <a data-link href="${homeLink}" class="home-link">${Octicon.three_bars}</a>
      <h2>${title}</h2>
    </div>
    <nav>
      ${panelToggleVisible ? Toggle(view, [['tree', 'code'], ['source', 'note']], App.mobilePanel) : ''}
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
  </header>
`

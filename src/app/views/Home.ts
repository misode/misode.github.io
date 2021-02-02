import { App } from '../App'
import { Header } from '../components/Header'
import { View } from './View'
import { Octicon } from '../components/Octicon'
import config from '../../config.json'

function cleanUrl(url: string) {
  url = url.startsWith('/') ? url : '/' + url
  return url.endsWith('/') ? url : url + '/'
}

export const GeneratorCard = (url: string, name: string, arrow?: boolean, active?: boolean) =>  `
  <li>
    <a data-link href="${cleanUrl(url)}" class="generators-card${active ? ' selected' : ''}">
      ${name}
      ${arrow ? Octicon.chevron_right : ''}
    </a>
  </li>
`

export const Home = (view: View): string => {  
  const filteredModels = config.models.filter(m => m.category === App.model.get()!.id)
  return `
    ${Header(view, 'Data Pack Generators')}
    <div class="home">
      <ul class="generators-list">
        ${config.models
          .filter(m => typeof m.category !== 'string')
          .map(m => GeneratorCard(m.id, m.name, m.category === true, App.model.get()!.id === m.id))
          .join('')}
      </ul>
      ${filteredModels.length === 0 ? '' : `
        <ul class="generators-list">
          ${filteredModels.map(m => GeneratorCard(m.id, m.name)).join('')}
        </ul>
      `}
    </div>
  `
}

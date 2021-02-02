import { Header } from '../components/Header'
import { View } from './View'
import { locale } from '../Locales'
import { GeneratorCard } from './Home'

export const NotFound = (view: View): string => {  
  return `
    ${Header(view, 'Data Pack Generators')}
    <div class="home center">
      <h2 class="very-large">404</h2>
      <p>${locale('not_found.description')}</p>
      <ul class="generators-list">
        ${GeneratorCard('/', locale('home'), true)}
      </ul>
    </div>
  `
}

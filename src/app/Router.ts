import { App, checkVersion, Models } from './App';
import { View } from './views/View';
import { Home } from './views/Home'
import { NotFound } from './views/NotFound'
import { FieldSettings } from './views/FieldSettings'
import { Generator } from './views/Generator'
import { locale } from './Locales';
import { Tracker } from './Tracker';
import config from '../config.json'

const categories = config.models.filter(m => m.category === true)

const router = async () => {
  localStorage.length

  const urlParts = location.pathname.split('/').filter(e => e)  
  const urlParams = new URLSearchParams(location.search)
  console.debug(`[router] ${urlParts.join('/')}`)

  const target = document.getElementById('app')!
  let title = locale('title.home')
  let renderer = (view: View) => ''
  let panel = 'home'

  if (urlParts.length === 0){
    App.model.set({ id: '', name: 'Data Pack', category: true, minVersion: '1.15'})
    renderer = Home
  } else if (urlParts[0] === 'settings' && urlParts[1] === 'fields') {
    panel = 'settings'
    renderer = FieldSettings
  } else if (urlParts.length === 1 && categories.map(m => m.id).includes(urlParts[0])) {
    App.model.set(categories.find(m => m.id === urlParts[0])!)
    renderer = Home
  } else {
    panel = 'tree'
    const model = config.models.find(m => m.id === urlParts.join('/')) ?? null
    App.model.set(model)
    if (model) {
      if (urlParams.has('q')) {
        try {
          const data = atob(urlParams.get('q') ?? '')
          Models[model.id].reset(JSON.parse(data))
        } catch (e) {}
      }
      renderer = Generator
      title = locale('title.generator', [locale(model.id)])
    } else {
      renderer = NotFound
    }
  }

  console.debug(`[router] Renderer=${renderer.name}`)

  const versions = config.versions
    .filter(v => checkVersion(v.id, App.model.get()?.minVersion))
    .map(v => v.id).join(', ')
  document.title = `${title} Minecraft ${versions}`
  console.debug(`[router] Title=${title} Versions=${versions}`)
  App.mobilePanel.set(panel)
  const view = new View()
  view.mount(target, renderer(view), true)
  console.debug(`[router] Done!`)
}

window.addEventListener("popstate", router);

document.addEventListener("DOMContentLoaded", () => {
  console.debug(`[DOMContentLoaded] LocalStorage=${'localStorage' in window} Caches=${'caches' in window}`)
  App.version.trigger()
  document.body.addEventListener("click", e => {
    if (e.target instanceof Element
      && e.target.hasAttribute('data-link')
      && e.target.hasAttribute('href')
    ) {
      e.preventDefault();
      const target = e.target.getAttribute('href')!
      console.debug(`[data-link] ${target}`)
      Tracker.pageview(target)
      history.pushState(null, '', target);
      router();
    }
  });
  router();
});

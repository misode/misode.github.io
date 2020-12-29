import { App, Models } from './App';
import { View } from './views/View';
import { Home } from './views/Home'
import { FieldSettings } from './views/FieldSettings'
import { Generator } from './views/Generator'
import { locale } from './Locales';
import { Tracker } from './Tracker';
import config from '../config.json'

const categories = config.models.filter(m => m.category === true)

const router = async () => {
  const urlParts = location.pathname.split('/').filter(e => e)  
  const urlParams = new URLSearchParams(location.search)

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
    App.model.set(config.models.find(m => m.id === urlParts.join('/'))!)
    if (urlParams.has('q')) {
      try {
        const data = atob(urlParams.get('q') ?? '')
        Models[App.model.get()!.id].reset(JSON.parse(data))
      } catch (e) {}
    }
    renderer = Generator
    if (App.model.get()) {
      title = locale('title.generator', [locale(App.model.get()!.id)])
    }
  }

  document.title = locale('title.suffix', [title])
  App.mobilePanel.set(panel)
  const view = new View()
  view.mount(target, renderer(view), true)
}

window.addEventListener("popstate", router);

document.addEventListener("DOMContentLoaded", () => {
  document.body.addEventListener("click", e => {
    if (e.target instanceof Element
      && e.target.hasAttribute('data-link')
      && e.target.hasAttribute('href')
    ) {
      e.preventDefault();
      const target = e.target.getAttribute('href')!
      Tracker.pageview(target)
      history.pushState(null, '', target);
      router();
    }
  });
  router();
});

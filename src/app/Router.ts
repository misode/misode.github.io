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
  const view = new View()
  let title = locale('title.home')

  if (urlParts.length === 0){
    App.model.set({ id: '', name: 'Data Pack', category: true})
    target.innerHTML = Home(view)
  } else if (urlParts[0] === 'settings' && urlParts[1] === 'fields') {
    target.innerHTML = FieldSettings(view)
  } else if (urlParts.length === 1 && categories.map(m => m.id).includes(urlParts[0])) {
    App.model.set(categories.find(m => m.id === urlParts[0])!)
    target.innerHTML = Home(view)
  } else {
    App.model.set(config.models.find(m => m.id === urlParts.join('/'))!)
    if (urlParams.has('q')) {
      try {
        const data = atob(urlParams.get('q') ?? '')
        Models[App.model.get()!.id].reset(JSON.parse(data))
      } catch (e) {}
    }
    target.innerHTML = Generator(view)
    if (App.model.get()) {
      title = locale('title.generator', [locale(App.model.get()!.id)])
    }
  }

  document.title = locale('title.suffix', [title])
  view.mounted(target)
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

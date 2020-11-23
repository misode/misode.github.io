import { App } from './App';
import { View } from './views/View';
import { Home } from './views/Home'
import { Generator } from './views/Generator'
import config from '../config.json'

const categories = config.models.filter(m => m.category === true)

const router = async () => {
  const urlParts = location.pathname.split('/').filter(e => e)  
  const target = document.getElementById('app')!
  const view = new View()

  if (urlParts.length === 0){
    App.model.set({ id: '', name: 'Data Pack', category: true})
    target.innerHTML = Home(view)
  } else if (urlParts.length === 1 && categories.map(m => m.id).includes(urlParts[0])) {
    App.model.set(categories.find(m => m.id === urlParts[0])!)
    target.innerHTML = Home(view)
  } else {
    App.model.set(config.models.find(m => m.id === urlParts.join('/'))!)
    target.innerHTML = Generator(view)
  }
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
      history.pushState(null, '', e.target.getAttribute('href'));
      router();
    }
  });
  router();
});

import Split from 'split.js'
import {
  Base,
  DataModel,
  locale,
  LOCALES,
  ModelPath,
  SourceView,
  TreeView,
  Path,
} from '@mcschema/core'
import { getCollections, getSchemas } from '@mcschema/java-1.16'
import { VisualizerView } from './visualization/VisualizerView'
import { RegistryFetcher } from './RegistryFetcher'
import { ErrorsView } from './ErrorsView'
import config from '../config.json'
import { BiomeNoiseVisualizer } from './visualization/BiomeNoiseVisualizer'

const LOCAL_STORAGE_THEME = 'theme'
const LOCAL_STORAGE_LANGUAGE = 'language'

const publicPath = '/';

const modelFromPath = (p: string) => p.replace(publicPath, '').replace(/\/$/, '')

const addChecked = (el: HTMLElement) => {
  el.classList.add('check')
  setTimeout(() => {
    el.classList.remove('check')
  }, 2000)
}

const treeViewObserver = (el: HTMLElement) => {
  el.querySelectorAll('.node-header[data-help]').forEach(e => {
    const div = document.createElement('div')
    div.className = 'node-icon'
    div.addEventListener('click', evt => {
      div.getElementsByTagName('span')[0].classList.add('show')
      document.body.addEventListener('click', evt => {
        div.getElementsByTagName('span')[0].classList.remove('show')
      }, { capture: true, once: true })
    })
    div.insertAdjacentHTML('beforeend', `<span class="icon-popup">${e.getAttribute('data-help')}</span><svg class="node-help" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z"></path></svg>`)
    e.appendChild(div)
  })
  el.querySelectorAll('.node-header[data-error]').forEach(e => {
    const div = document.createElement('div')
    div.className = 'node-icon'
    div.addEventListener('click', evt => {
      div.getElementsByTagName('span')[0].classList.add('show')
      document.body.addEventListener('click', evt => {
        div.getElementsByTagName('span')[0].classList.remove('show')
      }, { capture: true, once: true })
    })
    div.insertAdjacentHTML('beforeend', `<span class="icon-popup">${e.getAttribute('data-error')}</span><svg class="node-error" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z"></path></svg>`)
    e.appendChild(div)
  })
  el.querySelectorAll('.collapse.closed, button.add').forEach(e => {
    e.insertAdjacentHTML('afterbegin', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM8 0a8 8 0 100 16A8 8 0 008 0zm.75 4.75a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z"></path></svg>`)
  })
  el.querySelectorAll('.collapse.open, button.remove').forEach(e => {
    e.insertAdjacentHTML('afterbegin', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.405 15h5.19c.9 0 1.652-.681 1.741-1.576l.66-6.6a.75.75 0 00-1.492-.149l-.66 6.6a.25.25 0 01-.249.225h-5.19a.25.25 0 01-.249-.225l-.66-6.6z"></path></svg>`)
  })
}

const treeViewNodeInjector = (path: ModelPath, view: TreeView) => {
  let res = VisualizerView.visualizers
    .filter(v => v.active(path))
    .map(v => {
      const id = view.registerClick(() => {
        views.visualizer.set(v, path)
        views.visualizer.model.invalidate()
      })
      return `<button data-id=${id}>${locale('visualize')} <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM8 0a8 8 0 100 16A8 8 0 008 0zM6.379 5.227A.25.25 0 006 5.442v5.117a.25.25 0 00.379.214l4.264-2.559a.25.25 0 000-.428L6.379 5.227z"></path></svg></button>`
    })
    .join('')
  if (views.visualizer.active && views.visualizer.visualizer?.getName() === 'biome-noise') {
    if (path.pop().endsWith(new Path(['generator', 'biome_source', 'biomes']))) {
      const biomeVisualizer = views.visualizer.visualizer as BiomeNoiseVisualizer
      const biome = path.push('biome').get()
      const id = view.registerChange(el => {
        biomeVisualizer.setBiomeColor(biome, (el as HTMLInputElement).value)
        views.visualizer.visualizer!.state = {}
        views.visualizer.invalidated()
      })
      res += `<input type="color" value="${biomeVisualizer.getBiomeHex(biome)}" data-id=${id}></input>`
    }
  }
  return res
}

const fetchLocale = async (id: string) => {
  const response = await fetch(publicPath + `locales/${id}.json`)
  LOCALES.register(id, await response.json())
}
LOCALES.language = localStorage.getItem(LOCAL_STORAGE_LANGUAGE)?.toLowerCase() ?? 'en'

const homeLink = document.getElementById('home-link')!
const homeGenerators = document.getElementById('home-generators')!
const categoryGenerators = document.getElementById('category-generators')!
const selectedModel = document.getElementById('selected-model')!
const languageSelector = document.getElementById('language-selector')!
const languageSelectorMenu = document.getElementById('language-selector-menu')!
const themeSelector = document.getElementById('theme-selector')!
const treeViewEl = document.getElementById('tree-view')!
const sourceViewEl = document.getElementById('source-view')!
const errorsViewEl = document.getElementById('errors-view')!
const homeViewEl = document.getElementById('home-view')!
const errorsToggle = document.getElementById('errors-toggle')!
const sourceViewOutput = (document.getElementById('source-view-output') as HTMLTextAreaElement)
const treeViewOutput = document.getElementById('tree-view-output')!
const sourceControlsToggle = document.getElementById('source-controls-toggle')!
const sourceControlsMenu = document.getElementById('source-controls-menu')!
const sourceControlsCopy = document.getElementById('source-controls-copy')!
const sourceControlsDownload = document.getElementById('source-controls-download')!
const sourceControlsShare = document.getElementById('source-controls-share')!
const sourceToggle = document.getElementById('source-toggle')!
const treeControlsToggle = document.getElementById('tree-controls-toggle')!
const treeControlsMenu = document.getElementById('tree-controls-menu')!
const treeControlsReset = document.getElementById('tree-controls-reset')!
const treeControlsUndo = document.getElementById('tree-controls-undo')!
const treeControlsRedo = document.getElementById('tree-controls-redo')!
const visualizerContent = document.getElementById('visualizer-content')!
const githubLink = document.getElementById('github-link')!

Split([treeViewEl, sourceViewEl], {
  sizes: [66, 34]
})

Split([sourceViewOutput, visualizerContent], {
  sizes: [60, 40],
  direction: 'vertical'
})

const dummyModel = new DataModel(Base)

const views = {
  'tree': new TreeView(dummyModel, treeViewOutput, {
    showErrors: true,
    observer: treeViewObserver,
    nodeInjector: treeViewNodeInjector
  }),
  'source': new SourceView(dummyModel, sourceViewOutput, {
    indentation: 2
  }),
  'errors': new ErrorsView(dummyModel, errorsViewEl),
  'visualizer': new VisualizerView(dummyModel, visualizerContent)
}

const COLLECTIONS = getCollections()

Promise.all([
  fetchLocale(LOCALES.language),
  ...(LOCALES.language === 'en' ? [] : [fetchLocale('en')]),
  RegistryFetcher(COLLECTIONS, config.registries)
]).then(responses => {

  const SCHEMAS = getSchemas(COLLECTIONS)

  let models: { [key: string]: DataModel } = {}  
  const buildModel = (model: any) => {
    if (model.schema) {
      models[model.id] = new DataModel(SCHEMAS.get(model.schema))
    } else if (model.children) {
      model.children.forEach(buildModel)
    }
  }
  config.models.forEach(buildModel)
  

  let selected = ''
  Object.values(models).forEach(m => m.validate(true))

  const updateModel = () => {
    let title = ''
    if (models[selected] === undefined) {
      title = locale('title.home')
    } else {
      title = locale('title.generator', [locale(selected)])
      Object.values(views).forEach(v => v.setModel(models[selected]))
      models[selected].invalidate()
    }
  }

  const updateLanguage = (id: string, store = false) => {
    LOCALES.language = id
    if (store) {
      localStorage.setItem(LOCAL_STORAGE_LANGUAGE, id)
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = locale(el.attributes.getNamedItem('data-i18n')!.value)
    })

    languageSelectorMenu.innerHTML = ''
    config.languages.forEach(lang => {
      languageSelectorMenu.insertAdjacentHTML('beforeend',
        `<div class="btn${lang.code === LOCALES.language ? ' selected' : ''}">${lang.name}</div>`)
      languageSelectorMenu.lastChild?.addEventListener('click', evt => {
        updateLanguage(lang.code, true)
        languageSelectorMenu.style.visibility = 'hidden'
      })
    })

    if (LOCALES.has(id)) {
      updateModel()
    } else {
      fetchLocale(id).then(r => {
        updateModel()
      })
    }
  }

  homeLink.addEventListener('click', evt => {
    reload(publicPath)
  })

  window.onpopstate = (evt: PopStateEvent) => {
    reload(location.pathname)
  }

  sourceToggle.addEventListener('click', evt => {
    if (sourceViewEl.classList.contains('active')) {
      sourceViewEl.classList.remove('active')
      sourceToggle.classList.remove('toggled')
    } else {
      sourceViewEl.classList.add('active')
      sourceToggle.classList.add('toggled')
    }
  })

  languageSelector.addEventListener('click', evt => {
    languageSelectorMenu.style.visibility = 'visible'
    document.body.addEventListener('click', evt => {
      languageSelectorMenu.style.visibility = 'hidden'
    }, { capture: true, once: true })
  })

  const updateTheme = (theme: string | null) => {
    ga('set', 'dimension1', theme ?? 'default');
    if (theme === null) return
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
      themeSelector.classList.add('toggled')
      localStorage.setItem(LOCAL_STORAGE_THEME, 'dark')
    } else {
      document.documentElement.setAttribute('data-theme', 'light')
      themeSelector.classList.remove('toggled')
      localStorage.setItem(LOCAL_STORAGE_THEME, 'light')
    }
  }
  updateTheme(localStorage.getItem(LOCAL_STORAGE_THEME))

  themeSelector.addEventListener('click', evt => {
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
      updateTheme('light')
    } else {
      updateTheme('dark')
    }
  })

  sourceControlsToggle.addEventListener('click', evt => {
    sourceControlsMenu.style.visibility = 'visible'
    document.body.addEventListener('click', evt => {
      sourceControlsMenu.style.visibility = 'hidden'
    }, { capture: true, once: true })
  })

  sourceControlsCopy.addEventListener('click', evt => {
    sourceViewOutput.select()
    document.execCommand('copy');
    addChecked(sourceControlsCopy)
  })

  sourceControlsDownload.addEventListener('click', evt => {
    const fileContents = encodeURIComponent(JSON.stringify(models[selected].data, null, 2) + "\n")
    const dataString = "data:text/json;charset=utf-8," + fileContents
    const downloadAnchor = document.getElementById('source-controls-download-anchor')!
    downloadAnchor.setAttribute("href", dataString)
    downloadAnchor.setAttribute("download", "data.json")
    downloadAnchor.click()
  })

  sourceControlsShare.addEventListener('click', evt => {
    const data = btoa(JSON.stringify(JSON.parse(views.source.target.value)));
    const url = window.location.origin + window.location.pathname + '?q=' + data
    const shareInput = document.getElementById('source-controls-share-input') as HTMLInputElement
    shareInput.value = url
    shareInput.style.display = 'inline-block'
    document.body.addEventListener('click', evt => {
      shareInput.style.display = 'none'
    }, { capture: true, once: true })
    shareInput.select()
    document.execCommand('copy');
  })

  treeControlsToggle.addEventListener('click', evt => {
    treeControlsMenu.style.visibility = 'visible'
    document.body.addEventListener('click', evt => {
      treeControlsMenu.style.visibility = 'hidden'
    }, { capture: true, once: true })
  })

  treeControlsReset.addEventListener('click', evt => {
    models[selected].reset(models[selected].schema.default(), true)
    addChecked(treeControlsReset)
  })

  treeControlsUndo.addEventListener('click', evt => {
    models[selected].undo()
  })

  treeControlsRedo.addEventListener('click', evt => {
    models[selected].redo()
  })

  document.addEventListener('keyup', evt => {
    if (evt.ctrlKey && evt.key === 'z') {
      models[selected].undo()
    } else if (evt.ctrlKey && evt.key === 'y') {
      models[selected].redo()
    }
  })

  errorsToggle.addEventListener('click', evt => {
    if (errorsViewEl.classList.contains('active')) {
      errorsViewEl.classList.remove('active')
      errorsToggle.classList.remove('toggled')
    } else {
      errorsViewEl.classList.add('active')
      errorsToggle.classList.add('toggled')
    }
  })

  githubLink.addEventListener('click', () => {
    window.open('https://github.com/misode/misode.github.io', '_blank')
  })

  const reload = (target: string, track=true) => {
    if (!target.endsWith('/')) {
      target = `${target}/`
    }

    if (target.startsWith('/dev/')) {
      reload(target.slice(4))
      return
    }

    if (track) {
      ga('set', 'page', target)
      ga('send', 'pageview');
      history.pushState(target, 'Change Page', target)
    }
    selected = modelFromPath(target) ?? ''

    const params = new URLSearchParams(window.location.search);

    const panels = [treeViewEl, sourceViewEl, errorsViewEl]
    if (models[selected] === undefined) {
      homeViewEl.style.display = '';
      (document.querySelector('.gutter') as HTMLElement).style.display = 'none';
      (document.querySelector('.content') as HTMLElement).style.overflowY = 'initial'
      panels.forEach(v => v.style.display = 'none')

      const addGen = (output: HTMLElement) => (m: any) => {
        output.insertAdjacentHTML('beforeend', 
          `<div class="generators-card${m.id === selected ? ' selected' : ''}">
            ${locale(m.name)}
            ${m.schema ? '' : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"></path></svg>'}
          </div>`)
          output.lastChild?.addEventListener('click', evt => {
          reload(publicPath + m.id)
        })
      }

      homeGenerators.innerHTML = ''
      categoryGenerators.innerHTML = ''
      config.models.forEach(addGen(homeGenerators))
      config.models.find(m => m.id === selected)?.children?.forEach(addGen(categoryGenerators))
      
    } else {
      homeViewEl.style.display = 'none';
      (document.querySelector('.gutter') as HTMLElement).style.display = ''
      panels.forEach(v => v.style.display = '')
      
      if (params.has('q')) {
        const data = atob(params.get('q')!)
        models[selected].reset(JSON.parse(data))
      }
    }

    updateLanguage(LOCALES.language)
  }
  reload(location.pathname, false)
  document.body.style.visibility = 'initial'
})

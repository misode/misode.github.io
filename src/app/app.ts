import { RegistryFetcher } from './RegistryFetcher'
import {
  DataModel,
  IView,
  TreeView,
  SourceView,
  ConditionSchema,
  LootTableSchema,
  AdvancementSchema,
  DimensionSchema,
  DimensionTypeSchema,
  LOCALES,
  locale,
  COLLECTIONS
} from 'minecraft-schemas'
import Split from 'split.js'

import { SandboxSchema } from './Sandbox'
import { ErrorsView } from './ErrorsView'

const LOCAL_STORAGE_THEME = 'theme'

const modelFromPath = (p: string) => p.split('/').filter(e => e.length !== 0).pop() ?? ''

const addChecked = (el: HTMLElement) => {
  el.classList.add('check')
  setTimeout(() => {
    el.classList.remove('check')
  }, 2000)
}

const languages: { [key: string]: string } = {
  'en': 'English',
  'pt': 'Português',
  'ru': 'Русский',
  'zh-CN': '简体中文'
}

const registries = [
  'attribute',
  'biome',
  'biome_source',
  'block',
  'enchantment',
  'entity_type',
  'fluid',
  'item',
  'loot_condition_type',
  'loot_function_type',
  'loot_pool_entry_type',
  'stat_type',
  'structure_feature'
]

const treeViewObserver = (el: HTMLElement) => {
  el.querySelectorAll('.node-header[data-error]').forEach(e => {
    e.insertAdjacentHTML('beforeend', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z"></path></svg>`)
  })
}

const publicPath = process.env.NODE_ENV === 'production' ? '/dev/' : '/';
Promise.all([
  fetch(publicPath + 'locales/schema/en.json').then(r => r.json()),
  fetch(publicPath + 'locales/app/en.json').then(r => r.json()),
  RegistryFetcher(COLLECTIONS, registries)
]).then(responses => {
  LOCALES.register('en', {...responses[0], ...responses[1]})

  const selectedModel = document.getElementById('selected-model')!
  const modelSelector = document.getElementById('model-selector')!
  const modelSelectorMenu = document.getElementById('model-selector-menu')!
  const languageSelector = document.getElementById('language-selector')!
  const languageSelectorMenu = document.getElementById('language-selector-menu')!
  const themeSelector = document.getElementById('theme-selector')!
  const treeViewEl = document.getElementById('tree-view')!
  const sourceViewEl = document.getElementById('source-view')!
  const errorsViewEl = document.getElementById('errors-view')!
  const errorsToggle = document.getElementById('errors-toggle')!
  const sourceViewOutput = (document.getElementById('source-view-output') as HTMLTextAreaElement)
  const sourceControlsToggle = document.getElementById('source-controls-toggle')!
  const sourceControlsMenu = document.getElementById('source-controls-menu')!
  const sourceControlsCopy = document.getElementById('source-controls-copy')!
  const sourceControlsDownload = document.getElementById('source-controls-download')!
  const sourceToggle = document.getElementById('source-toggle')!

  let selected = modelFromPath(location.pathname)

  const models: { [key: string]: DataModel } = {
    'loot-table': new DataModel(LootTableSchema),
    'predicate': new DataModel(ConditionSchema),
    'advancement': new DataModel(AdvancementSchema),
    'dimension': new DataModel(DimensionSchema),
    'dimension-type': new DataModel(DimensionTypeSchema),
    'sandbox': new DataModel(SandboxSchema)
  }

  const views: { [key: string]: IView } = {
    'tree': new TreeView(models[selected], treeViewEl, {
      showErrors: true,
      observer: treeViewObserver
    }),
    'source': new SourceView(models[selected], sourceViewOutput, {
      indentation: 2
    }),
    'errors': new ErrorsView(models[selected], errorsViewEl)
  }

  const updateModel = (newModel: string) => {
    selected = newModel
    for (const v in views) {
      views[v].setModel(models[selected])
    }
    selectedModel.textContent = locale(`title.${selected}`)
  
    modelSelectorMenu.innerHTML = ''
    Object.keys(models).forEach(m => {
      modelSelectorMenu.insertAdjacentHTML('beforeend', 
        `<div class="btn${m === selected ? ' selected' : ''}">${locale(m)}</div>`)
      modelSelectorMenu.lastChild?.addEventListener('click', evt => {
        updateModel(m)
        history.pushState({model: m}, m, publicPath + m)
        modelSelectorMenu.style.visibility = 'hidden'
      })
    })

    models[selected].invalidate()
  }

  const updateLanguage = (key: string) => {
    LOCALES.language = key
  
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = locale(el.attributes.getNamedItem('data-i18n')!.value)
    })

    languageSelectorMenu.innerHTML = ''
    Object.keys(languages).forEach(key => {
      languageSelectorMenu.insertAdjacentHTML('beforeend',
        `<div class="btn${key === LOCALES.language ? ' selected' : ''}">${languages[key]}</div>`)
      languageSelectorMenu.lastChild?.addEventListener('click', evt => {
        updateLanguage(key)
        languageSelectorMenu.style.visibility = 'hidden'
      })
    })

    updateModel(selected)
  }
  updateLanguage('en')

  Split([treeViewEl, sourceViewEl], {
    sizes: [66, 34]
  })

  modelSelector.addEventListener('click', evt => {
    modelSelectorMenu.style.visibility = 'visible'
    document.body.addEventListener('click', evt => {
      modelSelectorMenu.style.visibility = 'hidden'
    }, { capture: true, once: true })
  })

  window.onpopstate = (evt: PopStateEvent) => {
    updateModel(modelFromPath(location.pathname))
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
    if (theme === null) return
    if (theme === 'dark') {
      document.body.setAttribute('data-style', 'dark')
      themeSelector.classList.add('toggled')
      localStorage.setItem(LOCAL_STORAGE_THEME, 'dark')
    } else {
      document.body.setAttribute('data-style', 'light')
      themeSelector.classList.remove('toggled')
      localStorage.setItem(LOCAL_STORAGE_THEME, 'light')
    }
  }
  updateTheme(localStorage.getItem(LOCAL_STORAGE_THEME))

  themeSelector.addEventListener('click', evt => {
    if (document.body.getAttribute('data-style') === 'dark') {
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

  errorsToggle.addEventListener('click', evt => {
    if (errorsViewEl.classList.contains('hidden')) {
      errorsViewEl.classList.remove('hidden')
      errorsToggle.classList.remove('toggled')
    } else {
      errorsViewEl.classList.add('hidden')
      errorsToggle.classList.add('toggled')
    }
  })

  document.body.style.visibility = 'initial'
})

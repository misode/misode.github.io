import {
  DataModel,
  IView,
  TreeView,
  SourceView,
  ConditionSchema,
  LootTableSchema,
  AdvancementSchema,
  LOCALES,
  locale
} from 'minecraft-schemas'
import Split from 'split.js'

import { SandboxSchema } from './Sandbox'


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

const publicPath = process.env.NODE_ENV === 'production' ? '/dev/' : '/';
Promise.all([
  fetch(publicPath + 'locales/schema/en.json').then(r => r.json()),
  fetch(publicPath + 'locales/app/en.json').then(r => r.json())
]).then(responses => {
  LOCALES.register('en', {...responses[0], ...responses[1]})

  const selectedModel = document.getElementById('selected-model')!
  const modelSelector = (document.getElementById('model-selector') as HTMLInputElement)
  const modelSelectorMenu = document.getElementById('model-selector-menu')!
  const languageSelector = document.getElementById('language-selector')!
  const languageSelectorMenu = document.getElementById('language-selector-menu')!
  const themeSelector = document.getElementById('theme-selector')!
  const githubLink = document.getElementById('github-link')!
  const treeViewEl = document.getElementById('tree-view')!
  const sourceViewEl = document.getElementById('source-view')!
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
    'sandbox': new DataModel(SandboxSchema)
  }

  const views: { [key: string]: IView } = {
    'tree': new TreeView(models[selected], treeViewEl),
    'source': new SourceView(models[selected], sourceViewOutput, {indentation: 2})
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
    if (sourceViewEl.classList.contains('toggled')) {
      sourceViewEl.classList.remove('toggled')
      sourceToggle.children[0].classList.remove('inactive')
      sourceToggle.children[1].classList.add('inactive')
    } else {
      sourceViewEl.classList.add('toggled')
      sourceToggle.children[0].classList.add('inactive')
      sourceToggle.children[1].classList.remove('inactive')
    }
  })

  languageSelector.addEventListener('click', evt => {
    languageSelectorMenu.style.visibility = 'visible'
    document.body.addEventListener('click', evt => {
      languageSelectorMenu.style.visibility = 'hidden'
    }, { capture: true, once: true })
  })

  themeSelector.addEventListener('click', evt => {
    Array.from(themeSelector.children).forEach(el => {
      if (el.classList.contains('inactive')) {
        el.classList.remove('inactive')
      } else {
        el.classList.add('inactive')
      }
    })
  })

  githubLink.addEventListener('click', evt => {
    location.href = 'https://github.com/misode/minecraft-schemas'
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

  document.body.style.visibility = 'initial'
})

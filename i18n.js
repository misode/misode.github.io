const lngs = [
  ['en', 'English'],
  ['ru', 'Русский'],
  ['zh-CN', '简体中文']
]

lngs.forEach(v => $('#lngList').append(`<a class="dropdown-item" onclick="changeLng('${v[0]}')">${v[1]}</a>`))

i18next
  .use(i18nextBrowserLanguageDetector)
  .use(i18nextXHRBackend)
  .init({
    backend: { loadPath: 'locales/{{lng}}.json' },
    fallbackLng: 'en',
    whitelist: lngs.map(v => v[0])
  })
  .then(() => {
    jqueryI18next.init(i18next, $, { parseDefaultValueFromContent: false })
    $('html').localize()
  })

function changeLng(code) {
  i18next.changeLanguage(code).then(() => {
    $('html').localize()
  })
}

i18next
  .use(i18nextBrowserLanguageDetector)
  .use(i18nextXHRBackend)
  .init({
    backend: { loadPath: 'locales/{{lng}}.json' },
    whitelist: ['en', 'zh_CN'],
    fallbackLng: 'en'
  })
  .then(() => {
    jqueryI18next.init(i18next, $, { parseDefaultValueFromContent: false })
    $('html').localize()
  })

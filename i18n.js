i18next
  .use(i18nextBrowserLanguageDetector)
  .use(i18nextXHRBackend)
  .init({
    backend: { loadPath: 'locales/{{lng}}.json' },
    whitelist: ['en'],
    fallbackLng: 'en'
  })
  .then(() => {
    jqueryI18next.init(i18next, $, { parseDefaultValueFromContent: false })
    $('html').localize()
  })

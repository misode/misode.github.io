import { ModelPath, Path } from '@mcschema/core'

interface Locale {
  [key: string]: string
}

const Locales: {
  [key: string]: Locale
} = {}

let language = 'en'

export function registerLocale(code: string, locale: Locale) {
  Locales[code] = locale
}

export function hasLocale(code: string) {
  return Locales[code] !== undefined
}

export function setLanguage(code: string | undefined) {
  language = code ?? language
}

export function getLanguage() {
  return language
}

export function resolveLocaleParams(value: string, params?: string[]): string | undefined {
  return value?.replace(/%\d+%/g, match => {
    const index = parseInt(match.slice(1, -1))
    return params?.[index] !== undefined ? params[index] : match
  })
}

export function locale(key: string, params?: string[]): string {
  const value: string | undefined = Locales[language][key] ?? Locales.en[key]
  return resolveLocaleParams(value, params) ?? key
}

export function segmentedLocale(segments: string[], params?: string[], depth = 5, minDepth = 1): string | undefined {
  return [language, 'en'].reduce((prev: string | undefined, code) => {
      if (prev !== undefined) return prev

      const array = segments.slice(-depth);
      while (array.length >= minDepth) {
          const locale = resolveLocaleParams(Locales[code][array.join('.')], params)
          if (locale !== undefined) return locale
          array.shift()
      }

      return undefined
  }, undefined)
}

export function pathLocale(path: Path, params?: string[]): string {
  // return path.getContext().slice(-5).join('.')
  return segmentedLocale(path.getContext(), params)
    ?? path.getContext()[path.getContext().length - 1] ?? ''
}

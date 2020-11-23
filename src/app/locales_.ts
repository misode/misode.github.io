import English from '../locales/en.json'
import { App } from './app_'

interface Locale {
  [key: string]: string
}

export const Locales: {
  [key: string]: Locale
} = {
  'en': English
}

export function resolveLocaleParams(value: string, params?: string[]): string | undefined {
  return value?.replace(/%\d+%/g, match => {
    const index = parseInt(match.slice(1, -1))
    return params?.[index] !== undefined ? params[index] : match
  })
}

export function locale(key: string, params?: string[]): string {
  const value: string | undefined = Locales[App.language.get()]?.[key] ?? Locales.en[key]
  return resolveLocaleParams(value, params) ?? key
}

export function segmentedLocale(segments: string[], params?: string[], depth = 5, minDepth = 1): string | undefined {
  return [App.language.get(), 'en'].reduce((prev: string | undefined, code) => {
      if (prev !== undefined) return prev

      const array = segments.slice(-depth);
      while (array.length >= minDepth) {
          const locale = resolveLocaleParams(Locales[code]?.[array.join('.')], params)
          if (locale !== undefined) return locale
          array.shift()
      }

      return undefined
  }, undefined)
}

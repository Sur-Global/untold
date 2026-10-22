import { describe, it, expect } from 'vitest'
import { normalizeEnabledLocales, disabledLocaleRedirectPath } from '@/lib/languages'
import { mergePlatformSettings } from '@/lib/platform-settings/defaults'

describe('normalizeEnabledLocales', () => {
  it('keeps every language on when nothing has been chosen yet', () => {
    expect(normalizeEnabledLocales(undefined)).toEqual(['en', 'es', 'pt', 'fr', 'de', 'da'])
    expect(normalizeEnabledLocales('nope')).toEqual(['en', 'es', 'pt', 'fr', 'de', 'da'])
  })
  it('honours the chosen list in catalog order and always keeps the default language', () => {
    expect(normalizeEnabledLocales(['fr', 'es'])).toEqual(['en', 'es', 'fr'])
    expect(normalizeEnabledLocales([])).toEqual(['en'])
  })
  it('drops unknown codes and non-strings', () => {
    expect(normalizeEnabledLocales(['es', 'xx', 7, null, 'pt'])).toEqual(['en', 'es', 'pt'])
  })
})

describe('disabledLocaleRedirectPath', () => {
  const enabled = ['en', 'es', 'pt', 'fr']
  it('sends a switched-off language to the same page in the default language', () => {
    expect(disabledLocaleRedirectPath('/de/articles/mi-articulo', enabled)).toBe('/articles/mi-articulo')
    expect(disabledLocaleRedirectPath('/da', enabled)).toBe('/')
    expect(disabledLocaleRedirectPath('/de/', enabled)).toBe('/')
  })
  it('leaves enabled languages, the default language and other paths alone', () => {
    expect(disabledLocaleRedirectPath('/es/articles', enabled)).toBeNull()
    expect(disabledLocaleRedirectPath('/articles/de-la-tierra', enabled)).toBeNull()
    expect(disabledLocaleRedirectPath('/deutsch', enabled)).toBeNull()
    expect(disabledLocaleRedirectPath('/', enabled)).toBeNull()
  })
})

describe('platform settings: languages', () => {
  it('defaults to all languages and cleans a stored list', () => {
    expect(mergePlatformSettings(null).languages.enabled).toHaveLength(6)
    expect(mergePlatformSettings({ languages: { enabled: ['es', 'de'] } }).languages.enabled).toEqual(['en', 'es', 'de'])
  })
})

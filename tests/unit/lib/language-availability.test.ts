import { describe, it, expect, vi } from 'vitest'



import { readLanguageAvailability, languageLabel } from '@/lib/language-availability'

function form(entries: Array<[string, string]>) {
  const fd = new FormData()
  entries.forEach(([k, v]) => fd.append(k, v))
  return fd
}

describe('readLanguageAvailability', () => {
  it('returns null when the form has no availability fields (never resets the setting)', () => {
    expect(readLanguageAvailability(form([['title', 'x']]))).toBeNull()
  })

  it('unchecked checkbox means available in all languages', () => {
    expect(readLanguageAvailability(form([['language_availability', '1']]))).toEqual({
      single_language: false,
      subtitle_locales: [],
    })
  })

  it('reads the checkbox and keeps only valid, unique subtitle languages', () => {
    const fd = form([
      ['language_availability', '1'],
      ['single_language', 'on'],
      ['subtitle_locales', 'en'],
      ['subtitle_locales', 'en'],
      ['subtitle_locales', 'xx'],
      ['subtitle_locales', 'pt'],
    ])
    expect(readLanguageAvailability(fd)).toEqual({ single_language: true, subtitle_locales: ['en', 'pt'] })
  })

  it('ignores subtitle languages when the item is not single-language', () => {
    const fd = form([['language_availability', '1'], ['subtitle_locales', 'en']])
    expect(readLanguageAvailability(fd)?.subtitle_locales).toEqual([])
  })
})

describe('languageLabel', () => {
  const t = (key: string, v?: Record<string, string>) => `${key}:${JSON.stringify(v)}`

  it('says "only in" for a single-language item without subtitles', () => {
    expect(languageLabel(t, 'en', { sourceLocale: 'es' })).toBe('onlyInLanguage:{"language":"Spanish"}')
  })

  it('names the language in the reader\'s language', () => {
    expect(languageLabel(t, 'es', { sourceLocale: 'es' })).toContain('"language":"Español"')
  })

  it('lists subtitle languages, never the original one', () => {
    const out = languageLabel(t, 'en', { sourceLocale: 'es', subtitleLocales: ['es', 'en', 'pt'] })
    expect(out).toBe('inLanguageWithSubtitles:{"language":"Spanish","subtitles":"English, Portuguese"}')
  })
})

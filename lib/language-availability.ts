// Pure helpers — safe to import from client components (no server-only imports here).
const LOCALES = ['en', 'es', 'pt', 'fr', 'de', 'da']

export interface LanguageAvailability {
  single_language: boolean
  subtitle_locales: string[]
}

/** Hidden field that tells the server the availability checkboxes were on the form. */
export const AVAILABILITY_MARKER = 'language_availability'

/**
 * Reads the "only available in this language" checkbox (+ subtitle languages) from a form.
 * Returns null when the form didn't include those fields, so saving an unrelated form
 * never resets the setting.
 */
export function readLanguageAvailability(formData: FormData): LanguageAvailability | null {
  if (!formData.get(AVAILABILITY_MARKER)) return null
  const single = formData.get('single_language') === 'on' || formData.get('single_language') === 'true'
  const subtitles = single
    ? formData
        .getAll('subtitle_locales')
        .map((v) => String(v))
        .filter((v, i, all) => LOCALES.includes(v) && all.indexOf(v) === i)
    : []
  return { single_language: single, subtitle_locales: subtitles }
}

/** Display name of a language, in the reader's own language ("español", "Spanish"…). */
export function languageName(code: string, displayLocale: string): string {
  try {
    const name = new Intl.DisplayNames([displayLocale], { type: 'language' }).of(code) ?? code
    return name.charAt(0).toLocaleUpperCase(displayLocale) + name.slice(1)
  } catch {
    return code
  }
}

/**
 * Label for single-language content: "Only in Español", or for videos with subtitles
 * "In Español · Subtitles: English, Português". `t` is the `content` translator.
 */
export function languageLabel(
  t: (key: string, values?: Record<string, string>) => string,
  displayLocale: string,
  { sourceLocale, subtitleLocales }: { sourceLocale: string; subtitleLocales?: string[] | null },
): string {
  const language = languageName(sourceLocale, displayLocale)
  const subtitles = (subtitleLocales ?? []).filter((l) => l !== sourceLocale)
  if (subtitles.length === 0) return t('onlyInLanguage', { language })
  return t('inLanguageWithSubtitles', {
    language,
    subtitles: subtitles.map((l) => languageName(l, displayLocale)).join(', '),
  })
}

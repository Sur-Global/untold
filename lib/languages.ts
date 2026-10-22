import { routing } from '@/i18n/routing'

// Languages the site is built for. Which of them are switched on is an admin setting
// (Admin → Settings → Languages). To offer a brand-new language, add it here and in
// i18n/routing.ts, lib/deepl.ts and messages/<code>.json — then it shows up as a switch.
export const LANGUAGE_CATALOG = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'da', label: 'Dansk' },
] as const

export const DEFAULT_LOCALE: string = routing.defaultLocale

const CATALOG_CODES: string[] = LANGUAGE_CATALOG.map((l) => l.code)

/**
 * Cleans up a stored list of enabled languages: unknown codes are dropped, the default language is
 * always on (the site needs somewhere to send visitors of a disabled language), and the order follows
 * the catalog. Anything unusable falls back to "all languages on".
 */
export function normalizeEnabledLocales(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...CATALOG_CODES]
  const wanted = new Set(raw.filter((c): c is string => typeof c === 'string'))
  wanted.add(DEFAULT_LOCALE)
  const list = CATALOG_CODES.filter((code) => wanted.has(code))
  return list.length > 0 ? list : [...CATALOG_CODES]
}

/**
 * For a request like /de/articles/x when German is switched off: the path to send the visitor to
 * (/articles/x in the default language), or null when no redirect is needed.
 */
export function disabledLocaleRedirectPath(pathname: string, enabled: string[]): string | null {
  const first = pathname.split('/')[1]
  if (!first || first === DEFAULT_LOCALE) return null
  if (!CATALOG_CODES.includes(first)) return null
  if (enabled.includes(first)) return null
  return pathname.slice(first.length + 1) || '/'
}

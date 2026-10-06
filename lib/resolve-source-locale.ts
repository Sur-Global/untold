import { SUPPORTED_LOCALES } from '@/lib/deepl'

/**
 * The language a new piece of content is written in. Comes from the language
 * picker on the create form; anything unknown falls back to English.
 */
export function resolveSourceLocale(formData: FormData): string {
  const requested = (formData.get('source_locale') as string | null)?.trim()
  return requested && (SUPPORTED_LOCALES as readonly string[]).includes(requested) ? requested : 'en'
}
